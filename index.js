const puppeteer = require('puppeteer');
const expect = require('expect-puppeteer');
const TIME_OUT = 60000;
const cp = require('child_process');
const shortid = require('shortid');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

(async () => {
    const logFileName = `${moment().format('YYYY-MM-DD_HHmmss')}.log`
    const log = (msg) => {
        const logFileFullDir = path.join(process.cwd(), `log`)

        if (!fs.existsSync(logFileFullDir)) {
            fs.mkdirSync(logFileFullDir)
        }

        var stream = fs.createWriteStream(`./log/${logFileName}`, { 'flags': 'a' })

        stream.write([moment().toLocaleString(), msg + '\n'].join(':\t'))

        stream.end()
    }

    let browser = await puppeteer.launch({
        headless: false,
        slowMo: 25,
        args: [
            '--disable-infobars',
            '--start-maximized'
        ]
    })

    const page = await browser.newPage()
    await page._client.send('Emulation.clearDeviceMetricsOverride');

    await page.goto('https://www.xiaoyayun.com/', { timeout: 60000 })
    const loginButtonSelector = '.deanunlogin a.deandlu'
    await expect(page).toMatchElement(loginButtonSelector, { timeout: TIME_OUT })
    await expect(page).toClick(loginButtonSelector, { timeout: TIME_OUT })

    await expect(page).toMatchElement('form[name="login"] a', { timeout: TIME_OUT })
    await expect(page).toClick('form[name="login"] a', { timeout: TIME_OUT })
    await expect(page).toMatchElement('.sltm', { timeout: TIME_OUT })
    await expect(page).toClick('.sltm ul li:nth-child(3)', { timeout: TIME_OUT })

    const uidInputSelector = 'form[name="login"] input[name="username"]'
    await expect(page).toMatchElement(uidInputSelector, { timeout: TIME_OUT })
    await page.focus(uidInputSelector)
    await page.type(uidInputSelector, '')

    const pwdInputSelector = 'form[name="login"] input[name="password"]'
    await expect(page).toMatchElement(pwdInputSelector, { timeout: TIME_OUT })
    await page.focus(pwdInputSelector)
    await page.type(pwdInputSelector, '')

    let code = ''
    let tryDetectTimes = 0

    const changeCode = async () => {
        await expect(page).toMatchElement('.rfm .xi2', { timeout: TIME_OUT })
        await expect(page).toClick('.rfm .xi2', { timeout: TIME_OUT })
        await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const startDetectCode = async () => {
        const doDetectCode = async () => {
            //识别验证码
            let regPromise = new Promise((resolve, reject) => {
                cp.exec(`python "C:\\Src\\auto_login\\digital_reg.py" "${codeImgFullPath}"`,
                    (err, stdout, stderr) => {
                        if (err) {
                            log('digital_reg.py has error:')
                            log(err)
                            resolve('')
                        } else {
                            resolve(stdout.trim())
                        }
                    })
            })

            //填写验证码
            code = await regPromise
        }

        //保存校验码
        const codeImgName = shortid.generate(),
            codeImgFullPath = `C:\\Src\\auto_login\\imgs\\${codeImgName}.png`,
            codeImgSelector = 'form[name="login"] span[id^="vseccode"] img.vm'

        const codeImg = await expect(page).toMatchElement(codeImgSelector, { timeout: TIME_OUT })
        await codeImg.screenshot({ path: codeImgFullPath })

        await doDetectCode()
        if (!code || code.length !== 4) {
            await changeCode()
            await startDetectCode()
        }
    }

    const tryPostDetectCode = async () => {
        await startDetectCode()

        log(`code:${code}`)
        await page.evaluate(() => document.querySelector('form[name="login"] input[name="seccodeverify"]').value = '')
        await page.type('form[name="login"] input[name="seccodeverify"]', code)

        await expect(page).toMatchElement('form[name="login"] button[name="loginsubmit"]', { timeout: TIME_OUT })
        log('click login btn')
        await expect(page).toClick('form[name="login"] button[name="loginsubmit"]', { timeout: TIME_OUT })

        try {
            let popuptextHandle = await page.waitForSelector('.popuptext', { timeout: 2000 })
            const popTextValue = await page.evaluate((popuptext) => {
                return popuptext.innerText
            }, popuptextHandle)

            if (popTextValue.indexOf('抱歉，验证码填写错误') >= 0) {
                log(`验证码填写错误:${tryDetectTimes + 1}`)
                tryDetectTimes++
                if (tryDetectTimes <= 10) {
                    await changeCode()
                    await tryPostDetectCode()
                } else {
                    log('尝试登录次数达到最大值：10')
                }
            } else {
                log('登录出错：' + popTextValue)
            }
        } catch (error) {
            log('未出现登录错误提示')
        }
    }

    await tryPostDetectCode()
})()
