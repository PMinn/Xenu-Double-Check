export function htmlEncode(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

export function createUUID() {
    var d = Date.now();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') d += performance.now();
    return 'A11y_xxxx_4xxx_yxxx_xxxx'.replace(/[x]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function createCSSLink(url) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', chrome.runtime.getURL(url));
    return link;
}

export function createStyle(style) {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = style;
    return styleElement;
}

export function getDateTimeString() {
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}${second.toString().padStart(2, '0')}`;
}

export function findNodeByIds(violations, ids) {
    return violations.map(violation => violation.nodes.filter(node => ids.includes(node.id))).flat();
}

export function Color(value) {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    if (value) {
        if (value.startsWith('#')) {
            value = value.replace('#', '');
            this.r = parseInt(value.substring(0, 2), 16);
            this.g = parseInt(value.substring(2, 4), 16);
            this.b = parseInt(value.substring(4, 6), 16);
        } else if (value.startsWith('rgb')) {
            const rgb = value.match(/\d+/g);
            this.r = parseInt(rgb[0]);
            this.g = parseInt(rgb[1]);
            this.b = parseInt(rgb[2]);
        }
    }

    // set

    this.setRGB = (r, g, b) => {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    this.setHex = (hex) => {
        hex = hex.replace('#', '');
        this.r = parseInt(hex.substring(0, 2), 16);
        this.g = parseInt(hex.substring(2, 4), 16);
        this.b = parseInt(hex.substring(4, 6), 16);
    }

    this.setRGBString = (rgb) => {
        const rgbArray = rgb.match(/\d+/g);
        this.r = parseInt(rgbArray[0]);
        this.g = parseInt(rgbArray[1]);
        this.b = parseInt(rgbArray[2]);
    }

    // to

    this.toHex = () => {
        return `${this.r.toString(16).padStart(2, '0')}${this.g.toString(16).padStart(2, '0')}${this.b.toString(16).padStart(2, '0')}`;
    }

    this.toHexString = () => {
        return `#${this.toHex()}`;
    }

    this.toRGB = () => {
        return [this.r, this.g, this.b];
    }

    this.toRGBString = () => {
        return `rgb(${this.toRGB().join(', ')})`;
    }
}

export const Logger = {
    log: function (message, ...args) {
        console.log(`[無障礙檢測] ${message}`, ...args);
    },
    error: function (message, ...args) {
        console.error(`[無障礙檢測] ${message}`, ...args);
    },
    warn: function (message, ...args) {
        console.warn(`[無障礙檢測] ${message}`, ...args);
    },
}
