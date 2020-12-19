(function(){

var div = document.createElement('div');
document.body.appendChild(div);

div.style.cssText = 'bottom:30px;background-color:#333333aa;color:#fff;padding:30px;z-index:1;position:fixed';

div.innerText = "Hello,\nWorld!";

var messages = [];

function notify(message){
    messages.push(message);
    setTimeout(function(){
        messages.shift();
    }, 5000)
    div.innerText = messages.join('\n');
    div.style.opacity = 5;
}

function loop(){
    div.style.opacity -= 0.01;
    if (div.style.opacity < 0) messages = [];
    setTimeout(loop, 10);
}
loop();

// write a little endian 4 integer x to bytes array at offset
function writeInt(bytes, offset, x){
    bytes[offset + 0] = x & 0xff;
    bytes[offset + 1] = (x >>> 8) & 0xff;
    bytes[offset + 2] = (x >>> 16) & 0xff;
    bytes[offset + 3] = x >>> 24;
}

// create crc32 table for checksum
var crcTable = new Uint32Array(256);
for (var i = 0; i < 256; i++){
    var c = i;
    for (var k = 0; k < 8; k++){
        c = c&1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
        crcTable[i] = c;
    }
}

// Zip object to store files in
function Zip(){
    this.local = [];
    this.central = [];
    this.localSize = 0;
    this.centralSize = 0;
    this.n = 0;
}

// add file to Zip object
Zip.prototype.add = function(data, path){
    path = new TextEncoder().encode(path);
    var local = this.local;
    var central = this.central;

    var localHeader = new Uint8Array(30);
    var centralHeader = new Uint8Array(46);
    var c = 0xffffffff;

    for (var i = 0; i < data.length; i++){
        c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    }

    c = c ^ 0xffffffff;

    localHeader.set([80, 75, 3, 4, 10]);
    writeInt(localHeader, 14, c);
    writeInt(localHeader, 18, data.length);
    writeInt(localHeader, 22, data.length);
    writeInt(localHeader, 26, path.length);

    local.push(localHeader);
    local.push(path);
    local.push(data);

    centralHeader.set([80, 75, 1, 2, 63, 0, 10]);
    writeInt(centralHeader, 16, c);
    writeInt(centralHeader, 20, data.length);
    writeInt(centralHeader, 24, data.length);
    writeInt(centralHeader, 28, path.length);
    centralHeader[38] = 32;
    writeInt(centralHeader, 42, this.localSize);

    central.push(centralHeader);
    central.push(path);

    this.localSize += 30 + path.length + data.length;
    this.centralSize += 46 + path.length;
    this.n++;
}

// convert Zip object to byte array
Zip.prototype.toBytes = function(){
    var offset = 0;
    var data = new Uint8Array(this.localSize + this.centralSize + 22);
    var end = new Uint8Array(22);

    end.set([80, 75, 5, 6]);
    writeInt(end, 8, this.n);
    writeInt(end, 10, this.n);
    writeInt(end, 12, this.centralSize);
    writeInt(end, 16, this.localSize);

    this.local.forEach(function(p){
        data.set(p, offset);
        offset += p.length;
    })
    this.central.forEach(function(p){
        data.set(p, offset);
        offset += p.length;
    })
    data.set(end, offset);
    return data;
}

// check if data starts with prefix, ignoring null values
function hasPrefix(data, prefix){
    for (var i = 0; i < prefix.length; i++){
        if (prefix[i] !== null && data[i] !== prefix[i]) return false;
    }
    return true;
}

// deduce file extension from first few bytes of file data
function getExtension(data){
    if (hasPrefix(data, [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50])) return "webp";
    if (hasPrefix(data, [0x47, 0x49, 0x46, 0x38])) return "gif";
    if (hasPrefix(data, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return "png";
    if (hasPrefix(data, [0xFF, 0xD8, 0xFF])) return "jpg";
    if (hasPrefix(data, [0x3c, 0x73, 0x76, 0x67])) return "svg";
    return "unknown";
}

var extensions = ["jpg", "jpeg", "gif", "svg", "webp", "png"];

// download all urls
var zip = new Zip();
var urls = Array.from(document.getElementsByTagName("img"))
    .map(function(image){ return image.src})
    .filter(function(x){ return x !== undefined})
    .filter(function(x){ return !x.startsWith("data:")}
);

urls = urls.concat(
    Array.from(document.getElementsByTagName("a"))
    .map(function(a){ return a.href})
    .filter(function(url){ return extensions.indexOf(url.toLowerCase().split(".").pop()) >= 0})
);

var name = "download-" + new Date().toISOString().replaceAll(":", "-").replace("T", "-").split(".")[0];

// count finished downloads
var counter = 0;
urls.forEach(function(url, k){
    // make request to download file
    var r = new XMLHttpRequest();
    // remember url in request object
    r.url = url;
    r.responseType = 'arraybuffer';
    r.open('GET', url);
    r.onloadend = function(e){
        counter++;
        notify("Downloading " + r.url);

        var data = new Uint8Array(e.target.response);

        // example filename:
        // download/00001.png
        var filename = name + "/" + (zip.n + 1 + "").padStart(5, '0') + "." + getExtension(data);

        if (data.length === 0){
            notify("Failed to download " + r.url);
        }else{
            zip.add(data, filename);
        }

        // when all downloads have finished, attach zip file to a clickable link and click it
        if (counter === urls.length){
            var a = document.createElement('a');
            var blob = new Blob([zip.toBytes()], {type: 'application/zip'});
            var url = URL.createObjectURL(blob);
            a.href = url;
            a.download = name + '.zip';
            document.body.appendChild(a);
            a.style = 'display: none';
            a.click();
            a.remove();
            notify("Done.");
        }
    }
    r.send();
})

})();
