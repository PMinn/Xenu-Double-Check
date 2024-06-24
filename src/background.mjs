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
var urlIndex = 0;
var reportTabId, targetTabId;
var isClosed, isOpened;
function openNextTab() {
    if (isOpened[urlIndex] || urlIndex >= urls.length) return;
    console.log('[open tab]', urls[urlIndex]);
    chrome.tabs.create({
        // active: false,
        url: urls[urlIndex]
    }, tab => {
        targetTabId = tab.id;
    });
    if (chrome.runtime.lastError) {
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon16.png'),
            title: "發生錯誤",
            message: chrome.runtime.lastError.message
        });
        for (let i = 0; i < urls.length; i++) {
            isClosed[i] = false;
            isOpened[i] = false;
        }
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action == 'startListen') {
        urls = request.urls;
        urlIndex = 0;
        reportTabId = sender.tab.id;
        isClosed = Array(urls.length).fill(false);
        isOpened = Array(urls.length).fill(false);
        openNextTab();
    } else if (request.action == 'startFrom') {
        for (let i = request.urlIndex; i < urls.length; i++) {
            isClosed[i] = false;
            isOpened[i] = false;
        }
        urlIndex = request.urlIndex;
        openNextTab();
    } else if (request.action == 'runThis') {
        isClosed[request.urlIndex] = false;
        isOpened[request.urlIndex] = false;
        urlIndex = request.urlIndex;
        openNextTab();
    }
})

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