/*
 Copyright (c) 2016 Dmitry Brant.
 http://dmitrybrant.com

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var ResultNode = function(key, value) {
    this.key = key !== undefined ? key.toString() : "";
    this.value = value !== undefined ? value.toString() : "";
    this.nodes = [];

    this.add = function(key, value) {
        var node = new ResultNode(key, value);
        this.nodes.push(node);
        return node;
    };

    this.addResult = function(node) {
        this.nodes.push(node);
        return node;
    }
};

var FileFormat = function() {
    this.ext = arguments[0];
    this.shortDesc = arguments[1];
    this.longDesc = arguments[2];
    this.wikiTitle = arguments[3];
    this.detectScripts = arguments[4];
    this.detectFunc = arguments[5];
    this.canPreviewNatively = false;
    this.parseFunc = null;
};

var FileFormatList = [

	new FileFormat("jpg", "Lossy format widely used for storing photos and images in digital cameras and the web.",
        "",
        "JPEG",
        [ "tiff.js", "filePsd.js", "fileJpg.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0xFF) && (await reader.byteAt(1) == 0xD8) && (await reader.byteAt(2) == 0xFF)
                && (await reader.byteAt(3) == 0xE0 || await reader.byteAt(3) == 0xE1 || await reader.byteAt(3) == 0xFE)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

	new FileFormat("png", "Lossless format widely used for storing graphics on the web.",
        "",
        "Portable Network Graphics",
        [ "filePng.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x89) && (await reader.byteAt(1) == 0x50)
                && (await reader.byteAt(2) == 0x4E) && (await reader.byteAt(3) == 0x47)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

    new FileFormat("gif", "Lossless format widely used for storing graphics on the web.",
        "",
        "GIF",
        [ "fileGif.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x47) && (await reader.byteAt(1) == 0x49)
                && (await reader.byteAt(2) == 0x46) && (await reader.byteAt(3) == 0x38) && (await reader.byteAt(5) == 0x61)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

    new FileFormat("tiff", "Lossless format used by digital cameras for storing raw images.",
        "",
        "Tagged Image File Format",
        [ "tiff.js", "fileJpg.js", "fileTiff.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x49) && (await reader.byteAt(1) == 0x49) && (await reader.byteAt(2) == 0x2A) && (await reader.byteAt(3) == 0)
                || (await reader.byteAt(0) == 0x4D) && (await reader.byteAt(1) == 0x4D) && (await reader.byteAt(2) == 0) && (await reader.byteAt(3) == 0x2A)) {
                return true;
            }
            else if ((await reader.byteAt(0) == 0x49) && (await reader.byteAt(1) == 0x49) && (await reader.byteAt(2) == 0x52) && (await reader.byteAt(3) == 0x4F)) {
                return true;
            }
            else if ((await reader.byteAt(0) == 0x49) && (await reader.byteAt(1) == 0x49) && (await reader.byteAt(2) == 0x55) && (await reader.byteAt(3) == 0)) {
                return true;
            }
            return false;
        }),

    new FileFormat("ppm", "Portable pixel map.",
        "",
        "Netpbm format",
        [ "filePnm.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x50) && (await reader.byteAt(1) >= 0x31) && (await reader.byteAt(1) <= 0x36)
                && ((await reader.byteAt(2) == 0xA) || (await reader.byteAt(2) == 0xD) || (await reader.byteAt(2) == 0x20))) {
                return true;
            }
            return false;
        }),

    new FileFormat("mov", "MP4/M4V/M4A/3GP/MOV audio/video.",
        "",
        "MPEG-4 Part 14",
        [ "tiff.js", "fileJpg.js", "filePng.js", "fileMov.js" ],
        async function(reader) {
            if ((await reader.byteAt(4) == 0x66) && (await reader.byteAt(5) >= 0x74) && (await reader.byteAt(6) <= 0x79) && (await reader.byteAt(7) == 0x70)) {
                return true;
            }
            return false;
        }),

    new FileFormat("bpg", "Better Portable Graphics format.",
        "",
        "Better Portable Graphics",
        [ "bpgdec8.js", "fileBpg.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x42) && (await reader.byteAt(1) >= 0x50) && (await reader.byteAt(2) <= 0x47) && (await reader.byteAt(3) == 0xFB)) {
                return true;
            }
            return false;
        }),

    new FileFormat("tga", "Truevision TARGA graphics file.",
        "",
        "Truevision TGA",
        [ "fileTga.js" ],
        async function(reader) {
            // only detectable via extension
            return false;
        }),

    new FileFormat("pcx", "ZSoft Paintbrush graphics.",
        "",
        "PCX",
        [ "filePcx.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0xA) && ((await reader.byteAt(1) == 0x3) || (await reader.byteAt(1) == 0x5)) && (await reader.byteAt(2) == 0x1)
                && ((await reader.byteAt(3) == 0x8) || (await reader.byteAt(3) == 0x4) || (await reader.byteAt(3) == 0x2) || (await reader.byteAt(3) == 0x1))) {
                return true;
            }
            return false;
        }),

    new FileFormat("sgi", "Silicon Graphics images (.RGB, .BW).",
        "",
        "Silicon Graphics Image",
        [ "fileSgi.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x1) && (await reader.byteAt(1) == 0xDA) && (await reader.byteAt(2) == 0x1)
                && (await reader.byteAt(3) == 0x1) && (await reader.byteAt(4) == 0x0)) {
                return true;
            }
            return false;
        }),

    new FileFormat("ras", "Sun Raster image.",
        "",
        "Sun Raster",
        [ "fileRas.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x59) && (await reader.byteAt(1) == 0xA6) && (await reader.byteAt(2) == 0x6A) && (await reader.byteAt(3) == 0x95)) {
                return true;
            }
            return false;
        }),

    new FileFormat("bmp", "Windows or OS/2 bitmap.",
        "",
        "BMP file format",
        [ "fileBmp.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x42) && (await reader.byteAt(1) == 0x4D) && (await reader.byteAt(6) == 0x0) && (await reader.byteAt(8) == 0x0)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

    new FileFormat("riff", "", "",
        "Resource Interchange File Format",
        [ "fileRiff.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x52) && (await reader.byteAt(1) == 0x49) && (await reader.byteAt(2) == 0x46) && (await reader.byteAt(3) == 0x46)) {
                var riffType = await reader.getAsciiStringAt(8, 4);
                if (riffType == "AVI ") {
                    this.ext = "avi";
                    this.shortDesc = "Audio Video Interleave format.";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                } else if (riffType == "WAVE" || riffType == "RMP3") {
                    this.ext = "wav";
                    this.shortDesc = "Windows wave audio.";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                } else if (riffType == "ACON") {
                    this.ext = "avi";
                    this.shortDesc = "";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                } else if (riffType == "RMID") {
                    this.ext = "mid";
                    this.shortDesc = "";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                } else if (riffType == "CDXA") {
                    this.ext = "cdxa";
                    this.shortDesc = "";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                } else if (riffType.indexOf("CDR") >= 0 || riffType == "cdr6") {
                    this.ext = "cdr";
                    this.shortDesc = "CorelDraw image.";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                } else if (riffType == "WEBP") {
                    this.ext = "webp";
                    this.shortDesc = "WebP image format.";
                    this.longDesc = "";
                    this.canPreviewNatively = true;
                } else if (riffType == "NUND") {
                    this.ext = "cpr";
                    this.shortDesc = "Cubase project file.";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                } else {
                    this.ext = "riff";
                    this.shortDesc = "General RIFF container format.";
                    this.longDesc = "";
                    this.canPreviewNatively = false;
                }
                return true;
            }
            return false;
        }),

    new FileFormat("raf", "Fujifilm raw image.",
        "",
        "",
        [ "tiff.js", "fileJpg.js", "fileRaf.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x46) && (await reader.byteAt(1) == 0x55) && (await reader.byteAt(2) == 0x4A) && (await reader.byteAt(3) == 0x49)) {
                if ((await reader.byteAt(12) == 0x52) && (await reader.byteAt(13) == 0x41) && (await reader.byteAt(14) == 0x57) && (await reader.byteAt(15) == 0x20)
                    && (await reader.byteAt(16) == 0x30) && (await reader.byteAt(17) == 0x32) && (await reader.byteAt(18) == 0x30) && (await reader.byteAt(19) == 0x31)) {
                    return true;
                }
            }
            return false;
        }),

    new FileFormat("xpm", "X PixMap icon.",
        "",
        "X PixMap",
        [ "fileXpm.js" ],
        async function(reader) {
            if ((await reader.byteAt(0) == 0x2F) && (await reader.byteAt(1) == 0x2A) && (await reader.byteAt(2) == 0x20)
                && (await reader.byteAt(3) == 0x58) && (await reader.byteAt(4) == 0x50) && (await reader.byteAt(5) == 0x4D)) {
                return true;
            }
            return false;
        }),

    new FileFormat("dicom", "DICOM (Digital Imaging and Communications in Medicine) image.",
        "",
        "DICOM",
        [ "fileDicom.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x80) == 0x44) && (await reader.byteAt(0x81) == 0x49) && (await reader.byteAt(0x82) == 0x43)
                && (await reader.byteAt(0x83) == 0x4D) && (await reader.byteAt(0x84) == 0x2) && (await reader.byteAt(0x85) == 0x0)) {
                return true;
            }
            return false;
        }),

    new FileFormat("mp3", "MPEG-1 or MPEG-2 Audio Layer III.",
        "",
        "MP3",
        [ "tiff.js", "fileJpg.js", "filePng.js", "filePsd.js", "fileMp3.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x0) == 0x49) && (await reader.byteAt(0x1) == 0x44) && (await reader.byteAt(0x2) == 0x33)
                && (await reader.byteAt(0x3) > 1) && (await reader.byteAt(0x3) < 8)) {
                return true;
            }
            return false;
        }),

    new FileFormat("zip", "ZIP compressed file container.",
        "",
        "Zip (file format)",
        [ "fileZip.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x0) == 0x50) && (await reader.byteAt(0x1) == 0x4B) && (await reader.byteAt(0x2) == 0x3) && (await reader.byteAt(0x3) == 0x4)) {
                return true;
            }
            return false;
        }),

    new FileFormat("psd", "Adobe Photoshop image.",
        "",
        "Adobe_Photoshop#File_format",
        [ "tiff.js", "fileJpg.js", "filePsd.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x0) == 0x38) && (await reader.byteAt(0x1) == 0x42) && (await reader.byteAt(0x2) == 0x50) && (await reader.byteAt(0x3) == 0x53) && (await reader.byteAt(0x5) == 0x1)) {
                return true;
            }
            return false;
        }),

    new FileFormat("ogg", "", "",
        "Ogg",
        [ "fileOgg.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x0) == 0x4F) && (await reader.byteAt(0x1) == 0x67) && (await reader.byteAt(0x2) == 0x67) && (await reader.byteAt(0x3) == 0x53)) {
                var oggType = await reader.getAsciiStringAt(0x1D, 6);
                if (oggType == "vorbis") {
                    this.ext = "oga";
                    this.shortDesc = "Ogg Vorbis audio.";
                    this.longDesc = "";
                } else if (oggType == "theora") {
                    this.ext = "ogv";
                    this.shortDesc = "Ogg Theora video.";
                    this.longDesc = "";
                } else {
                    this.ext = "ogg";
                    this.shortDesc = "Ogg container format.";
                    this.longDesc = "";
                }
                return true;
            }
            return false;
        }),

    new FileFormat("ole", "Microsoft OLE container format.",
        "",
        "Object Linking and Embedding",
        [ "fileOle.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x0) == 0xD0) && (await reader.byteAt(0x1) == 0xCF) && (await reader.byteAt(0x2) == 0x11) && (await reader.byteAt(0x3) == 0xE0) && (await reader.byteAt(0x4) == 0xA1) && (await reader.byteAt(0x5) == 0xB1)) {
                return true;
            }
            return false;
        }),

    new FileFormat("rar", "Roshal Archive container.",
        "",
        "RAR (file format)",
        [ "fileRar.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x0) == 0x52) && (await reader.byteAt(0x1) == 0x61) && (await reader.byteAt(0x2) == 0x72) && (await reader.byteAt(0x3) == 0x21) && (await reader.byteAt(0x4) == 0x1A) && (await reader.byteAt(0x5) == 0x7)) {
                return true;
            }
            return false;
        }),

    new FileFormat("amr", "Adaptive Multi-Rate audio codec.",
        "",
        "Adaptive Multi-Rate audio codec",
        [ "fileAmr.js" ],
        async function(reader) {
            if ((await reader.byteAt(0x0) == 0x23) && (await reader.byteAt(0x1) == 0x21) && (await reader.byteAt(0x2) == 0x41) && (await reader.byteAt(0x3) == 0x4D) && (await reader.byteAt(0x4) == 0x52)) {
                return true;
            }
            return false;
        })

];

var UnknownFileFormat = new FileFormat("", "Unknown file type", "", "", null, async function() {
    return true;
});

function getSupportedFormats() {
    var formats = "";
    for (var i = 0; i < FileFormatList.length; i++) {
        if (i > 0) {
            formats += ", ";
        }
        formats += FileFormatList[i].ext;
    }
    return formats;
}

async function detectFileFormat(reader) {
    var detectedFormat = null;
    for (var i = 0; i < FileFormatList.length; i++) {
        if (await FileFormatList[i].detectFunc(reader)) {
            detectedFormat = FileFormatList[i];
            break;
        }
    }
    return detectedFormat;
}

function detectFileFormatByExt(fileName) {
    var detectedFormat = null;
    var nameArr = fileName.split('.');
    if (nameArr == null || nameArr.length == 0) {
        return detectedFormat;
    }
    var extension = nameArr[nameArr.length - 1].toUpperCase();
    for (var i = 0; i < FileFormatList.length; i++) {
        if (FileFormatList[i].ext.toUpperCase() === extension) {
            detectedFormat = FileFormatList[i];
            break;
        }
    }
    return detectedFormat;
}
