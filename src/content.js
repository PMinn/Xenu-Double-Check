function process(block) {
    const children = block.childNodes;
    for (var i = 0; i < children.length; i++) {
        if (children[i].nodeName === 'A') {
            var href = children[i].getAttribute('href');
            if (isSource) {
                blinks[bLinksIndex].source.push(href);
            } else {
                // url
                bLinksIndex++;
                blinks[bLinksIndex] = {
                    url: href,
                    source: [],
                    element: children[i]
                };
            }
        } else if (children[i].nodeName === '#text') {
            var data = children[i].data;
            if (isSource) {
            } else {
                if (data.startsWith('empty URL')) {
                    // 空連結
                    bLinksIndex++;
                    blinks[bLinksIndex] = {
                        url: 'empty URL',
                        source: [],
                        errorCode: data.replace('empty URL', ''),
                        element: children[i]
                    };
                } else {
                    // error code
                    blinks[bLinksIndex].errorCode = data;
                }
            }
            if (data.includes('\t')) isSource = true;
            else if (data == '\n\n') isSource = false;
        }
    }
}

function createListPrefix(number, emoji = '') {
    const icon = document.createElement('div');
    const num = document.createElement('span');
    num.innerText = `${number}. `;

    const emo = document.createElement('span');
    emo.innerText = emoji;
    emo.style.marginRight = '5px';

    const startFrom = document.createElement('span');
    startFrom.innerText = '從這裡開始執行';
    startFrom.style.marginRight = '5px';
    startFrom.style.textDecoration = 'underline';
    startFrom.style.color = 'blue';

    const runThis = document.createElement('span');
    runThis.innerText = '執行這個';
    runThis.style.marginRight = '5px';
    runThis.style.textDecoration = 'underline';
    runThis.style.color = 'blue';

    icon.appendChild(num);
    icon.appendChild(emo);
    icon.appendChild(startFrom);
    icon.appendChild(runThis);
    return { icon, emo, startFrom, runThis };
}

const blinks = [];
var bLinksIndex = -1;
var isSource = false;
var isFinish = [];
var emptyURLs = [];
var ytimgURLs = [];
var normalURLs = [];
var trs = [];
var listPrefixes = [];

const h2s = document.querySelectorAll('h2');
const table = document.createElement('table');
table.classList.add('table');
document.body.prepend(table);
const thead = document.createElement('thead');
thead.innerHTML = `
<tr>
    <th>編號</th>
    <th>狀態</th>
    <th>狀態碼</th>
    <th>錯誤</th>
    <th>ip</th>
    <th>標題</th>
    <th>來自快取</th>
    <th>時間戳</th>
    <th>網址</th>
</tr>`;
table.appendChild(thead);

const tbody = document.createElement('tbody');
table.appendChild(tbody);
for (let i = 0; i < h2s.length; i++) {
    if (h2s[i].innerText.startsWith('Broken links, ordered by link:')) {
        process(h2s[i].nextElementSibling);
        isFinish = new Array(blinks.length).fill(false);
        for (let i = 0; i < blinks.length; i++) {
            const tr = document.createElement('tr');
            trs.push(tr);
            tbody.appendChild(tr);

            let parentDiv = blinks[i].element.parentNode;
            const listPrefix = createListPrefix(i + 1);
            parentDiv.insertBefore(listPrefix.icon, blinks[i].element);
            listPrefixes.push(listPrefix);
        }
        emptyURLs = blinks.filter(d => d.url == 'empty URL');
        ytimgURLs = blinks.filter(d => d.url.includes('ytimg.com'));
        normalURLs = blinks.filter(d => d.url != 'empty URL' && !d.url.includes('ytimg.com'));
        emptyURLs.forEach(d => {
            let blinkIndex = blinks.indexOf(d);
            isFinish[blinkIndex] = true;
            trs[blinkIndex].innerHTML = `
                <td>${blinkIndex + 1}</td>
                <td>⛔</td>
                <td></td>
                <td>empty URL</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            `;
            listPrefixes[blinkIndex].emo.innerText = '⛔';
            listPrefixes[blinkIndex].icon.scrollIntoView({ behavior: "smooth", block: "center" });
            var finishCount = isFinish.filter(d => d).length;
            document.title = `${generateOutput(Math.floor(finishCount / blinks.length * 100))} ${finishCount}/${blinks.length}`;
            if (finishCount == blinks.length) {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                document.title = '完成';
            }
        })
        ytimgURLs.forEach(d => {
            let blinkIndex = blinks.indexOf(d);
            isFinish[blinkIndex] = true;
            trs[blinkIndex].innerHTML = `
                <td>${blinkIndex + 1}</td>
                <td>⚠️</td>
                <td></td>
                <td>YT 預設圖片</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td class='url'><a href='${d.url}' target='_blank'>${d.url}</a></td>
            `;
            listPrefixes[blinkIndex].emo.innerText = '⚠️';
            listPrefixes[blinkIndex].icon.scrollIntoView({ behavior: "smooth", block: "center" });
            var finishCount = isFinish.filter(d => d).length;
            document.title = `${generateOutput(Math.floor(finishCount / blinks.length * 100))} ${finishCount}/${blinks.length}`;
            if (finishCount == blinks.length) {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                document.title = '完成';
            }
        })
        normalURLs.forEach((d, index) => {
            let blinkIndex = blinks.indexOf(d);
            let urlIndex = index;
            listPrefixes[blinkIndex].startFrom.addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: 'startFrom', urlIndex });
            })
            listPrefixes[blinkIndex].runThis.addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: 'runThis', urlIndex });
            })
        })
        chrome.runtime.sendMessage({ action: 'startListen', urls: normalURLs.map(d => d.url) });
        console.log(blinks)
        break;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { action } = request;
    if (action == 'result') {
        const { type, details, index, pageInfo } = request;
        console.log(type, details, pageInfo)
        const blinkIndex = blinks.indexOf(normalURLs[index]);
        var emoji;
        if ((type == 'completed' && details.statusCode >= 400) || type == 'errorOccurred') emoji = '⛔';
        else if (type == 'completed' && pageInfo?.isIncludesDomain == false) emoji = '✅';
        else emoji = '⚠️';
        isFinish[blinkIndex] = true;
        trs[blinkIndex].innerHTML = `
            <td>${blinkIndex + 1}</td>
            <td>${emoji}</td>
            <td>${details.statusCode ? details.statusCode : ''}</td>
            <td>${details.error ? details.error : ''}</td>
            <td>${details.ip ? details.ip : ''}</td>
            <td class='title'>${pageInfo?.title ? pageInfo.title : ''}</td>
            <td>${details.fromCache}</td>
            <td>${details.timeStamp}</td>
            <td class='url'><a href='${details.url}' target='_blank'>${details.url}</a></td>
        `;
        listPrefixes[blinkIndex].emo.innerText = '⛔';
        listPrefixes[blinkIndex].icon.scrollIntoView({ behavior: "smooth", block: "center" });
        var finishCount = isFinish.filter(d => d).length;
        document.title = `${generateOutput(Math.floor(finishCount / blinks.length * 100))} ${finishCount}/${blinks.length}`;
        if (finishCount == blinks.length) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.title = '完成';
        }
    }
})

function generateOutput(pct, width = 10) {
    const flr = Math.floor(pct * width / 100);
    const str = "#".repeat(flr).padEnd(width, "_");
    return `[${str}]`;
    // return `[${str}] ${pct}%`;
}