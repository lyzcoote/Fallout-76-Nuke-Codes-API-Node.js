# NukaCrypt API

## THIS PROJECT IS STILL IN DEVELOPMENT. 
## Documentation is not complete and the API is not yet ready for production use.

# Description
This repository contains a Node.js application that interacts with the NukaCrypt API to retrieve data about nuclear launch codes. The application is built using Express.js and Puppeteer, and it utilizes Redis for caching the retrieved data.

## Demo
A Demo (*Staging*) is available at this [link](https://api.wickerbeast.gay/).

***This demo is not always up to date with the latest version of the application.***

## Why Redis?

The NukaCrypt API is in reality the whole NukaCrypt site, which returns the Nuke Codes via GraphQL request.

This is very inefficient, as the application has to load the whole site and then parse the data to get the Nuke Codes.
This can be a problem if you have a lot of users accessing the API at the same time. 

To solve this problem, the application caches the retrieved data in Redis. 
This way, the application can serve the data from the cache instead of making a request to the NukaCrypt API every time a user accesses the API.

## Prerequisites

Before running the application, ensure you have the following dependencies installed:

- Node.js v16
- Redis (*optional if you have a Redis server somewhere else*)

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/lyzcoote/Fallout-76-Nuke-Codes-API-Node.js.git
   ```

2. Navigate to the project directory:

   ```bash
    cd Fallout-76-Nuke-Codes-API-Node.js
   ```

3. Install the required dependencies:

   ```bash
   npm install
   ```

## Configuration

The application requires Redis to be running. 
Make sure Redis is installed and running on your system. 

Although is **recommended** to host a Redis server somewhere else (like the [Redis Cloud](https://redis.com/try-free/)).

After that, update the Redis configuration in the `index.js` file:

```javascript
const redisClient = redis.createClient({
    password: 'REDIS-PASSWORD',
    socket: {
        host: 'REDIS-HOST',
        port: 'REDIS-PORT'
    }
});
```

Replace the values for `REDIS-PASSWORD`, `REDIS-HOST`, and `REDIS-PORT` with your Redis configuration.

## Usage

First, you need to install the dependencies by running the following command:

```bash
npm install
```

After that, start the application, run the following command:

```bash
npm run server
```

The application will start an Express server on port 80. You can access the API by navigating to `http://localhost` in your browser or using a tool like cURL or Postman.

The available API endpoint is `/`, which returns the nuclear launch codes retrieved from NukaCrypt or the Redis cache.

## API Documentation

### Request

- URL: `/`
- Method: `GET`
- Headers:
    - `no-cache` (optional): Set to `'true'` to bypass the Redis cache and fetch the data directly from NukaCrypt.

### Response

The API response is in JSON format and contains the following properties:

- `Alpha`: The Alpha Site launch code.
- `Bravo`: The Bravo Site launch code.
- `Charlie`: The Charlie Site launch code.
- `ResetsIn`: The time until the launch codes reset.
- `RenewalTime`: The estimated time of the next launch code reset.
- `Cached`: Indicates whether the response was retrieved from the Redis cache (`true`) or fetched from NukaCrypt (`false`).
- `PoweredBy`: The technology used to retrieve the data (`Redis` or `Puppeteer`).
- `isTimeAprox`: Indicates whether the renewal time is an approximation (`true`) or an exact time (`false`).

Example response:

```json
{
    "Alpha": "59192086",
    "Bravo": "62667842",
    "Charlie": "05091983",
    "ResetsIn": "2d 17h",
    "RenewalTime": "18/06/2023, 02:00:00",
    "Cached": true,
    "PoweredBy": "Redis",
    "isTimeAprox": true
}
```

## License

This project is licensed under the [MIT License](LICENSE).