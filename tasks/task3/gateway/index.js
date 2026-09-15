import { ApolloServer } from '@apollo/server';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import http from 'node:http';
import { AsyncLocalStorage } from 'node:async_hooks';

const reqStore = new AsyncLocalStorage();

class HeaderForwardingDataSource extends RemoteGraphQLDataSource {
 willSendRequest({ request }) {
 const headers = reqStore.getStore();
 if (!headers) return;
 const userId = headers.get && headers.get('userid');
 if (!userId) return;
 if (!request.http) request.http = { method: 'POST', headers: new Map() };
 if (!request.http.headers) request.http.headers = new Map();
 request.http.headers.set('userid', String(userId));
 }
}

const gateway = new ApolloGateway({
 serviceList: [
 { name: 'booking-subgraph', url: 'http://booking-subgraph:4001' },
 { name: 'hotel-subgraph', url: 'http://hotel-subgraph:4002' },
 { name: 'promocode-subgraph', url: 'http://promocode-subgraph:4003' },
 ],
 buildService({ name, url }) {
 return new HeaderForwardingDataSource({ url });
 },
});

const server = new ApolloServer({ gateway, subscriptions: false });
await server.start();

function readBody(req) {
 return new Promise((resolve, reject) => {
 const chunks = [];
 req.on('data', (c) => chunks.push(c));
 req.on('end', () => resolve(Buffer.concat(chunks).toString()));
 req.on('error', reject);
 });
}

const httpServer = http.createServer(async (req, res) => {
 if (req.method === 'GET' && req.url === '/health') {
 res.writeHead(200);
 res.end('ok');
 return;
 }
 try {
 const body = req.method === 'POST' ? JSON.parse(await readBody(req)) : undefined;
 const incomingHeaders = new Map();
 for (const [k, v] of Object.entries(req.headers)) {
 if (v !== undefined) incomingHeaders.set(k, Array.isArray(v) ? v.join(', ') : v);
 }
 const search = new URL(req.url, 'http://localhost').search || '';
 const response = await reqStore.run(incomingHeaders, () =>
 server.executeHTTPGraphQLRequest({
 httpGraphQLRequest: { method: req.method, headers: incomingHeaders, body, search },
 context: async () => ({
 userId: req.headers && req.headers['userid'],
 }),
 }),
 );
 const respHeaders = { 'Content-Type': 'application/json' };
 if (response.headers) for (const [k, v] of response.headers) respHeaders[k] = v;
 res.writeHead(response.status || 200, respHeaders);
 if (response.body.kind === 'complete') {
 res.end(response.body.string);
 } else {
 for await (const chunk of response.body.asyncIterator) res.write(chunk);
 res.end();
 }
 } catch (err) {
 console.error(err);
 res.writeHead(500);
 res.end(JSON.stringify({ error: err.message }));
 }
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
 console.log(`Gateway ready at http://localhost:${PORT}/`);
});
