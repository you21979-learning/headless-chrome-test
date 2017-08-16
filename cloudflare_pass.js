const chromeLauncher = require('chrome-launcher');
const HeadlessChrome = require('simple-headless-chrome')

const headlessChromeInit = async () => {
    const w = await chromeLauncher.launch({
        chromePath: '/usr/bin/google-chrome',
        port: 9222,
        startingUrl: 'https://google.com',
        logLevel: 'verbose',
        chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
    })
    console.log(`Chrome debugging port running on ${w.port}`);
    return w
}

const browserInit = async() => {
    const browser = new HeadlessChrome({
        launchChrome: true,
        chrome: {
            host: 'localhost',
            port: 9222,
            remote: true,
        },
    })
    await browser.init()
    return browser
}

const cfcheck = async(Runtime) => {
    // check
    const js = "document.querySelector('title').textContent";
    const result = await Runtime.evaluate({expression: js})
    if(result.result.value === 'Just a moment...'){
        return true
    }
    return false
}

const get = async (Page, Runtime, url) => {
    await Page.navigate({url: url});
    await Page.loadEventFired()
    while(1){
        const f = await cfcheck(Runtime)
        if(f === false){
            break;
        }
    }
    const js = "document.querySelector('body').textContent";
    const result = await Runtime.evaluate({expression: js})
    return result.result.value
}


const cloudflareCheck = async(tab) => {
    const res = await tab.evaluate(() => {
        const h = document.querySelector("title")
        if(h) return h.textContent
        return ""
    })
    if(res.result.value === 'Just a moment...'){
        return true
    }
    return false
}



const loopInit = async(tab) => {
    await tab.goTo('https://www.okex.com/api/v1/future_ticker.do?symbol=btc_usd&contract_type=this_week')
    while(1){
        const flag = await cloudflareCheck(tab)
        if(flag === false){
            break;
        }
    }
}

const loop = async (browser) => {
    const mainTab = await browser.newTab({ privateTab: false })
    mainTab.on('Network.requestWillBeSent', function (...params) {
        console.log(`-- Network.requestWillBeSent: `, ...params)
    })
    mainTab.on('Network.responseReceived', function (...params) {
        console.log(`-- Network.responseReceived: `, ...params)
    })
    await loopInit(mainTab);
}

const main = async () => {
    try {
        const instance = await headlessChromeInit()
        const browser = await browserInit()
        await loop(browser)
        await browser.close()
        instance.kill();
    }catch(e){
        console.log(e)
    }
}


main()

