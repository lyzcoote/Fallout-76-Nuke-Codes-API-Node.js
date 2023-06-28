// ########################################################
// #                                                      #
// #                      Init Phase                      #
// #                                                      #
// ########################################################

// Get libraries and modules
const cheerio = require('cheerio');
const express = require('express');
const puppeteer = require('puppeteer');
const redis = require('redis');
const LogManager = require('./LogManager.js');
const logger = new LogManager();

// Initialize Express and Redis
const app = express();

logger.info("Here we go!")
logger.debug(`Platform: ${process.platform}`);
logger.debug(`Node.js Version: ${process.version}`);
logger.debug(`Process ID: ${process.pid}`);
logger.debug(`Process Title: ${process.title}`);
logger.debug(`Process Arguments: ${process.argv}`);
logger.debug(`Process Executable Path: ${process.execPath}`);

logger.info('[EXPRESS] - Initializing Express...');


// Setup Redis
const start = async () => {
    if(process.env.REDIS_PASS === undefined || process.env.REDIS_HOST === undefined || process.env.REDIS_PORT === undefined)
    {
        console.error('[REDIS] - REDIS_PASS, REDIS_HOST, or REDIS_PORT is undefined! Please check your host environment variables and try again.');
        process.exit(1);
    }
    else {
        // Start Express
        app.listen(80, () => {
            logger.info('[EXPRESS] - Server is running on port 80');
        });
        logger.info('[REDIS] - Connecting to Redis...');
        await redisClient.connect();
    }
};
const redisClient = redis.createClient({
    password: process.env.REDIS_PASS || 'defaultPassword',
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    }
});



// ########################################################
// #                                                      #
// #                    Code Execution                    #
// #                                                      #
// ########################################################

// Connect to Redis and handle errors
start().then(() => {
    logger.info('[REDIS] - Connected to Redis');
}).catch(error => {
    console.error('[REDIS] - Failed to connect to Redis:', error);
    process.exit(1);
});

// Log requests to console for debugging reasons, this will be replaced with a proper logger later
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    // regex for "Uptime-Kuma/1.xx.xx"
    if(userAgent.match(/Uptime-Kuma\/1\.\d{1,2}\.\d{1,2}/g) && (req.headers['cf-connecting-ip'] === "93.48.169.84" || req.ip === "93.48.169.84"))
    {
        logger.debug(`[API] - Request from UptimeKuma Bot on Lyz's Zimaboard`);
    }
    else
    {
        logger.info(`[API] - Request from ${ip}, User-Agent: ${userAgent}\nHeaders: ${JSON.stringify(req.headers)}\n`);
    }


    
    next();
});

// Main API request handler
app.get('/', async (req, res) => {
    try {
        res.setHeader( 'X-Powered-By', 'Not a Windows BackOffice 4.5 Instance running on a MIPS Box emulated by a Protogen' );
        // Get cache values
        const cacheKeys = ['Alpha', 'Bravo', 'Charlie', 'RenewalTime'];
        const cacheValues = await Promise.all(cacheKeys.map(key => redisClient.get(key)));
        const cacheResetsIn = await redisClient.get('ResetsIn');
        let cacheResetsInMatch = null;

        // Try to parse the ResetsIn value from Redis via Regex
        try
        {
            const regex = /(\d{1,2}d\s\d{1,2}h)/g;
            const matches = regex.exec(cacheResetsIn);
            cacheResetsInMatch = matches ? matches[0] : null;
        }
        catch (err)
        {
            logger.warn('[REGEX] - Regex failed to run!');
            logger.warn(err);
            res.status(500).json({ result: 'error', error: error.message });
        }

        // If the client requested no-cache, fetch manually from NukaCrypt without saving to Redis
        if (req.headers['no-cache'] === 'true')
        {
            logger.debug("[API] - Client requested no-cache, fetching from NukaCrypt");
            await getFromNukaCrypt(req, res, true);
        }
        else if (cacheValues.every(value => value !== null)) // If all cache values are not null, return them from the Redis cache
        {
            logger.debug('[REDIS -> EXPRESS] - Retrieved data from cache');

            const response = {
                Alpha: cacheValues[0],
                Bravo: cacheValues[1],
                Charlie: cacheValues[2],
                ResetsIn: cacheResetsInMatch,
                RenewalTime: cacheValues[3],
                Cached: true,
                PoweredBy: 'Redis',
                isTimeAprox: true
            };

            res.status(200).json(response);
            logger.info('[API] - Response sent to client');
        }
        else // If any of the cache values are null, fetch from NukaCrypt and save to Redis
        {
            await getFromNukaCrypt(req, res, false);
        }
    }
    catch (error) { // If anything goes wrong, return a 500 error
        console.error(error);
        res.status(500).json({ result: 'error', error: error.message });
    }
});

app.post('/purge-cache', isAuth, async (res) => {
    logger.warn('[API] - Purge cache request received');
    try {
        const cacheKeys = ['Alpha', 'Bravo', 'Charlie', 'ResetsIn', 'RenewalTime'];
        await Promise.all(cacheKeys.map(key => redisClient.del(key)));
        let purgeResponse = {
                result: "success",
                message: "Cache has been purged",
            };
        logger.info('[API] - Cache purged')
        res.status(200).json(purgeResponse);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ result: 'error', error: error.message });
    }

});

// ########################################################
// #                                                      #
// #                       Functions                      #
// #                                                      #
// ########################################################

function parseResetTime(resetsIn) {
    const parts = resetsIn.split(' ');
    const days = parseInt(parts[0].replace('d', '')) || 0;
    const hours = parseInt(parts[1].replace('h', '')) || 0;
    const minutes = parseInt(parts[2].replace('m', '')) || 0;
    const seconds = parseInt(parts[3].replace('s', '')) || 0;
    return { days, hours, minutes, seconds };
}

function calculateRenewalTime(currentTime, resetsInTime) {
    const renewalTime = new Date(currentTime);
    renewalTime.setDate(renewalTime.getDate() + resetsInTime.days);
    renewalTime.setHours(renewalTime.getHours() + resetsInTime.hours);
    renewalTime.setMinutes(renewalTime.getMinutes() + resetsInTime.minutes);
    renewalTime.setSeconds(renewalTime.getSeconds() + resetsInTime.seconds);

    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };

    return renewalTime.toLocaleString('it-IT', options);
}

// Handle SIGINT (Ctrl+C) and disconnect from Redis
process.on('SIGINT', async () => {
    logger.warn('[SYSTEM] - Received SIGINT. Calling save function...');
    await redisClient.disconnect();
    process.exit(0);
});

// Get data from NukaCrypt
async function getFromNukaCrypt(req, res, force) {
    logger.info('[FETCHER] - Fetching data from NukaCrypt...');
    logger.warn('[FETCHER] - THIS MAY TAKE A WHILE!');

    // Main try block
    try {
        // Setup Puppeteer
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                '--disable-extensions',
            ],
        });

        // Get data from NukaCrypt
        const page = await browser.newPage();
        await page.goto('https://nukacrypt.com/home');
        const html = await page.content();
        await browser.close();

        // Scrap data from NukaCrypt via Cheerio
        const $ = cheerio.load(html);
        const alphaCode = $('.pl3:nth-child(1) > div:nth-child(2)').text().trim();
        const bravoCode = $('.pl3:nth-child(2) > div:nth-child(2)').text().trim();
        const charlieCode = $('.pl3:nth-child(3) > div:nth-child(2)').text().trim();
        const resetsIn = $('.flex-auto > div > span').text().trim();
        const resetsInTime = resetsIn ? parseResetTime(resetsIn) : null;
        const renewalTime = resetsInTime ? calculateRenewalTime(new Date(), resetsInTime) : null;

        // Setup response
        const response = {
            Alpha: alphaCode,
            Bravo: bravoCode,
            Charlie: charlieCode,
            ResetsIn: resetsIn,
            RenewalTime: renewalTime
        };

        // Return response
        response.Cached = false;
        response.PoweredBy = 'Puppeteer';
        response.isTimeAprox = false;

        res.status(200).json(response);
        logger.info('[API] - Response sent to client');

        // Save to Redis if not forced
        if (!force) {
            // Saving to Redis
            logger.info('[FETCHER -> REDIS] - Saving to Redis');
            // Exclude Cached, PoweredBy and isTimeAprox from saving to Redis
            let redisResponse = {
                Alpha: alphaCode,
                Bravo: bravoCode,
                Charlie: charlieCode,
                ResetsIn: resetsIn,
                RenewalTime: renewalTime
            };
            for (const [key, value] of Object.entries(redisResponse)) {
                try {
                    await redisClient.set(key, value);
                    logger.debug(`[REDIS] - Set ${key} to ${value}`);
                } catch (err) {
                    console.error("[REDIS] - An error occurred:" + err);
                    res.status(500).json({ result: 'error', error: error.message });
                }
            }
        }
    } catch (error) {
        console.error("Main App Crash: \n" + error);
        res.status(500).json({ result: 'error', error: error.message });
    }
}

function isAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (auth && auth === "6ae99e45c2f3cde907d42fc4cef95b01493f060ae79e183333a5d2b8abf79b142bb6fbe1303cd49bafb9dd1b89fb265c1d76f923e99c29029189b37b50b20f5e")
    {
        next();
    }
    else
    {
        logger.warn('[API] - Unauthorized access attempt via ' + req.headers['cf-connecting-ip'] + ' in ' + req.headers['cf-ipcountry'] + ' from ' + req.headers['user-agent'] + ' at ' + new Date().toLocaleString('it-IT'));
        res.status(401);
        res.send('Access forbidden');
    }
}