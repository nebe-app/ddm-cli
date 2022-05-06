export interface Endpoint {
	url: string;
	method: string;
}

export interface Endpoints {
	[key: string]: Endpoint;
}
