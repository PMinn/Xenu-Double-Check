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

function createIconElement(emoji) {
    const icon = document.createElement('div');
    icon.innerText = emoji;
    icon.style.display = 'inline-block';
    icon.style.marginRight = '5px';
    return icon;
}

const blinks = [];
var bLinksIndex = -1;
var isSource = false;
var finishCount = 0;
var emptyURLs = [];
var notEmptyURLs = [];
const h2s = document.querySelectorAll('h2');
const loading = document.createElement('div');
loading.id = 'loading';
document.body.appendChild(loading);
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
var trs = [];
for (let i = 0; i < h2s.length; i++) {
    if (h2s[i].innerText.startsWith('Broken links, ordered by link:')) {
        process(h2s[i].nextElementSibling);
        for (let i = 0; i < blinks.length; i++) {
            const tr = document.createElement('tr');
            trs.push(tr);
            tbody.appendChild(tr);
        }
        emptyURLs = blinks.filter(d => d.url == 'empty URL');
        notEmptyURLs = blinks.filter(d => d.url != 'empty URL');
        emptyURLs.forEach(d => {
            let parentDiv = d.element.parentNode;
            const blinkIndex = blinks.indexOf(d);
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
            const icon = createIconElement(`${blinkIndex + 1}. ⛔`);
            parentDiv.insertBefore(icon, d.element);
            icon.scrollIntoView({ behavior: "smooth", block: "center" });
            finishCount++;
            loading.style.width = `${finishCount / blinks.length * 100}%`;
            if (finishCount == blinks.length) loading.style.backgroundColor = 'green';
        })
        chrome.runtime.sendMessage({ action: 'startListen', urls: notEmptyURLs.map(d => d.url) });
        console.log(blinks)
        break;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { action } = request;
    if (action == 'result') {
        const { type, details, index, pageInfo } = request;
        console.log(type, details, pageInfo)
        let parentDiv = notEmptyURLs[index].element.parentNode;
        const blinkIndex = blinks.indexOf(notEmptyURLs[index]);
        var emoji;
        if ((type == 'completed' && details.statusCode >= 400) || type == 'errorOccurred') emoji = '⛔';
        else if (type == 'completed' && pageInfo?.isIncludesDomain == false) emoji = '✅';
        else emoji = '⚠️';
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
        const icon = createIconElement(`${blinkIndex + 1}. ${emoji}`);
        parentDiv.insertBefore(icon, notEmptyURLs[index].element);
        icon.scrollIntoView({ behavior: "smooth", block: "center" });
        finishCount++;
        loading.style.width = `${finishCount / blinks.length * 100}%`;
        if (finishCount == blinks.length) {
            loading.style.backgroundColor = 'green';
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }
    }
});