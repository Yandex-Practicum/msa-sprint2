import fetch from 'node-fetch';

export class RestClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetch(path) {
        let fetchUrl = this.baseUrl + path;
        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`Fetch error. Status: ${response.status}`);
            }
            let resp = await response.json();
            return resp;
        } catch (error) {
            let errorMsg = 'Failed to fetch from: ' + fetchUrl;
            console.error(error);
            throw new Error(errorMsg);
        }
    }
}