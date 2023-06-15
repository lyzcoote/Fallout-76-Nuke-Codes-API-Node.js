const cheerio = require('cheerio');
const express = require('express');
const puppeteer = require('puppeteer');
const redis = require('redis');

const app = express();
const redisClient = redis.createClient({
    password: 'FurryYiff69!',
    socket: {
        host: 'redis-10058.c250.eu-central-1-1.ec2.cloud.redislabs.com',
        port: 10058
    }
});

const start = async () => {
    await redisClient.connect();
};

start().then(() => {
    console.log('Connected to Redis');
}).catch(error => {
    console.error('Failed to connect to Redis:', error);
    process.exit(1);
});

app.use((req, res, next) => {
    const timestamp = new Date().toLocaleString();
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;

    console.log(`[${timestamp}] Request from ${ip}, User-Agent: ${userAgent}\nHeaders: ${JSON.stringify(req.headers)}\n`);
    next();
});

app.get('/', async (req, res) => {
    try {
        const cacheKeys = ['Alpha', 'Bravo', 'Charlie', 'RenewalTime'];
        const cacheValues = await Promise.all(cacheKeys.map(key => redisClient.get(key)));
        const cacheResetsIn = await redisClient.get('ResetsIn');

        let cacheResetsInMatch = null;
        try {
            const regex = /(\d{1,2}d\s\d{1,2}h)/g;
            const matches = regex.exec(cacheResetsIn);
            cacheResetsInMatch = matches ? matches[0] : null;
        } catch (err) {
            console.warn('FAILED TO RUN REGEX! Error:\n', err);
        }

        if (req.headers['no-cache'] === 'true')
        {
            console.log("Client requested no-cache, fetching from NukaCrypt");
            await getFromNukaCrypt(req, res, force = true);
        }
        else if (cacheValues.every(value => value !== null))
        {
            console.log('Retrieved data from cache');

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

            res.json(response);
        }
        else
        {
            await getFromNukaCrypt(req, res, force = false);
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ result: 'error', error: error.message });
    }
});

app.get('/loaderio-318019772b93552616e185652243807f', async (req, res) => {
    const file = `${__dirname}/loaderio-318019772b93552616e185652243807f.txt`;
    res.download(file); // Set disposition and send it.
});

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

app.listen(80, () => {
    console.log('Server is running on port 80');
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT. Calling save function...');
    await redisClient.disconnect();
    process.exit(0);
});

async function getFromNukaCrypt(req, res, force) {
    console.log('Retrieving data from NukaCrypt...\nTHIS MAY TAKE A WHILE!');

    try {
        const browser = await puppeteer.launch({
            args: [
                '--headless=new',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
                '--disable-extensions',
            ],
        });

        const page = await browser.newPage();
        await page.goto('https://nukacrypt.com/home');
        const html = await page.content();
        await browser.close();

        const $ = cheerio.load(html);
        const alphaCode = $('.pl3:nth-child(1) > div:nth-child(2)').text().trim();
        const bravoCode = $('.pl3:nth-child(2) > div:nth-child(2)').text().trim();
        const charlieCode = $('.pl3:nth-child(3) > div:nth-child(2)').text().trim();
        const resetsIn = $('.flex-auto > div > span').text().trim();

        const resetsInTime = resetsIn ? parseResetTime(resetsIn) : null;
        const renewalTime = resetsInTime ? calculateRenewalTime(new Date(), resetsInTime) : null;

        console.log('Retrieved data from NukaCrypt is:\n', alphaCode, bravoCode, charlieCode, resetsIn, renewalTime);

        const response = {
            Alpha: alphaCode,
            Bravo: bravoCode,
            Charlie: charlieCode,
            ResetsIn: resetsIn,
            RenewalTime: renewalTime
        };

        if(!force)
        {
            // Saving to Redis
            console.log("Saving to Redis cache...");
            for (const [key, value] of Object.entries(response))
            {
                try {
                    await redisClient.set(key, value);
                    console.log(`Set ${key} to ${value}`);
                } catch (err) {
                    console.error(err);
                }
            }
        }


        response.Cached = false;
        response.PoweredBy = 'Puppeteer';
        response.isTimeAprox = false;

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ result: 'error', error: error.message });
    }
}
