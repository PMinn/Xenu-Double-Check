chrome.action.onClicked.addListener(tab => {
    chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["css/content.css"]
    });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    })
});

var urls;
var urlsWithoutProtocol;
var urlIndex = 0;
var reportTabId, targetTabId;
var isClosed;

function openNextTab() {
    if (urlIndex >= urls.length) return;
    console.log('[open tab]', urls[urlIndex]);
    chrome.tabs.create({
        // active: false,
        url: urls[urlIndex]
    }, tab => {
        targetTabId = tab.id;
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action == 'startListen') {
        urls = request.urls;
        urlsWithoutProtocol = urls.map(url => url.replaceAll('https://', '').replaceAll('http://', ''));
        urlIndex = 0;
        reportTabId = sender.tab.id;
        isClosed = Array(urls.length).fill(false);
        openNextTab();
    }
});

chrome.webRequest.onCompleted.addListener(details => {
    if (details.tabId == targetTabId) {
        console.log('[completed]', details.tabId, details.url, details)
        let tempTargetTabId = targetTabId;
        if (details.statusCode == 200) {
            isClosed[urlIndex] = true;
            function getPageInfo() {
                var value = document.body.innerText.toLowerCase();
                return {
                    isIncludesDomain: value.includes('domain') || value.includes('網域'),
                    title: document.title,
                };
            }
            chrome.scripting.executeScript({
                target: { tabId: tempTargetTabId },
                func: getPageInfo
            }).then(injectionResults => {
                const { result } = injectionResults[0];
                console.log(injectionResults);
                chrome.tabs.remove(tempTargetTabId);
                chrome.tabs.sendMessage(reportTabId, { action: 'result', type: 'completed', details, index: urlIndex, pageInfo: result });
                urlIndex++;
                openNextTab();
            });
        } else {
            setTimeout(() => {
                if (!isClosed[urlIndex]) {
                    isClosed[urlIndex] = true;
                    chrome.tabs.remove(tempTargetTabId);
                    chrome.tabs.sendMessage(reportTabId, { action: 'result', type: 'completed', details, index: urlIndex, pageInfo: {} });
                    urlIndex++;
                    openNextTab();
                }
            }, 10000)
        }
    }
}, { urls: ["<all_urls>"], types: ["main_frame"] })

chrome.webRequest.onErrorOccurred.addListener(details => {
    if (details.error != 'net::ERR_ABORTED' && details.tabId == targetTabId) {
        console.log('[errorOccurred]', details.tabId, details.url, details)
        isClosed[urlIndex] = true;
        chrome.tabs.remove(targetTabId);
        chrome.tabs.sendMessage(reportTabId, { action: 'result', type: 'errorOccurred', details, index: urlIndex });
        urlIndex++;
        openNextTab();
    }
}, { urls: ["<all_urls>"], types: ["main_frame"] })