import fetch from 'node-fetch';

export class RestClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetch(path, options = {}) {
        let fetchUrl = this.baseUrl + path;
        try {
            const response = await fetch(fetchUrl, {
                method: options.method || 'GET',
            });
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

    async fetchNoThrow(path, options = {}) {
        let fetchUrl = this.baseUrl + path;
        try {
            const response = await fetch(fetchUrl, {
                method: options.method || 'GET',
            });
            if (!response.ok) {
                console.error(`Fetch error. Status: ${response.status} from: ${fetchUrl}`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}