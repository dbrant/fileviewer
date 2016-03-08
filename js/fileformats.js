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
    this.detectScripts = arguments[3];
    this.detectFunc = arguments[4];
    this.canPreviewNatively = false;
    this.parseFunc = null;
};

var FileFormatList = [

	new FileFormat("jpg",
        "Lossy format widely used for storing photos and images in digital cameras and the web.",
        "",
        [ "tiff.js", "filePsd.js", "fileJpg.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0xFF) && (reader.byteAt(1) == 0xD8) && (reader.byteAt(2) == 0xFF)
                && (reader.byteAt(3) == 0xE0 || reader.byteAt(3) == 0xE1 || reader.byteAt(3) == 0xFE)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

	new FileFormat("png",
        "Lossless format widely used for storing graphics on the web.",
        "",
        [ "filePng.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x89) && (reader.byteAt(1) == 0x50)
                && (reader.byteAt(2) == 0x4E) && (reader.byteAt(3) == 0x47)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

    new FileFormat("gif",
        "Lossless format widely used for storing graphics on the web.",
        "",
        [ "fileGif.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x47) && (reader.byteAt(1) == 0x49)
                && (reader.byteAt(2) == 0x46) && (reader.byteAt(3) == 0x38) && (reader.byteAt(5) == 0x61)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

    new FileFormat("tiff",
        "Lossless format used by digital cameras for storing raw images.",
        "",
        [ "tiff.js", "fileTiff.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x49) && (reader.byteAt(1) == 0x49) && (reader.byteAt(2) == 0x2A) && (reader.byteAt(3) == 0)
                || (reader.byteAt(0) == 0x4D) && (reader.byteAt(1) == 0x4D) && (reader.byteAt(2) == 0) && (reader.byteAt(3) == 0x2A)) {
                return true;
            }
            else if ((reader.byteAt(0) == 0x49) && (reader.byteAt(1) == 0x49) && (reader.byteAt(2) == 0x52) && (reader.byteAt(3) == 0x4F)) {
                return true;
            }
            else if ((reader.byteAt(0) == 0x49) && (reader.byteAt(1) == 0x49) && (reader.byteAt(2) == 0x55) && (reader.byteAt(3) == 0)) {
                return true;
            }
            return false;
        }),

    new FileFormat("ppm",
        "Portable pixel map.",
        "",
        [ "filePnm.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x50) && (reader.byteAt(1) >= 0x31) && (reader.byteAt(1) <= 0x36)
                && ((reader.byteAt(2) == 0xA) || (reader.byteAt(2) == 0xD) || (reader.byteAt(2) == 0x20))) {
                return true;
            }
            return false;
        }),

    new FileFormat("mov",
        "MP4/M4V/M4A/3GP/MOV audio/video.",
        "",
        [ "tiff.js", "fileJpg.js", "filePng.js", "fileMov.js" ],
        function(reader) {
            if ((reader.byteAt(4) == 0x66) && (reader.byteAt(5) >= 0x74) && (reader.byteAt(6) <= 0x79) && (reader.byteAt(7) == 0x70)) {
                return true;
            }
            return false;
        }),

    new FileFormat("bpg",
        "Better Portable Graphics format.",
        "",
        [ "bpgdec8.js", "fileBpg.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x42) && (reader.byteAt(1) >= 0x50) && (reader.byteAt(2) <= 0x47) && (reader.byteAt(3) == 0xFB)) {
                return true;
            }
            return false;
        }),

    new FileFormat("tga",
        "Truevision TARGA graphics file.",
        "",
        [ "fileTga.js" ],
        function(reader) {
            // only detectable via extension
            return false;
        }),

    new FileFormat("pcx",
        "ZSoft Paintbrush graphics.",
        "",
        [ "filePcx.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0xA) && ((reader.byteAt(1) == 0x3) || (reader.byteAt(1) == 0x5)) && (reader.byteAt(2) == 0x1)
                && ((reader.byteAt(3) == 0x8) || (reader.byteAt(3) == 0x4) || (reader.byteAt(3) == 0x2) || (reader.byteAt(3) == 0x1))) {
                return true;
            }
            return false;
        }),

    new FileFormat("sgi",
        "Silicon Graphics images (.RGB, .BW).",
        "",
        [ "fileSgi.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x1) && (reader.byteAt(1) == 0xDA) && (reader.byteAt(2) == 0x1)
                && (reader.byteAt(3) == 0x1) && (reader.byteAt(4) == 0x0)) {
                return true;
            }
            return false;
        }),

    new FileFormat("ras",
        "Sun Raster image.",
        "",
        [ "fileRas.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x59) && (reader.byteAt(1) == 0xA6) && (reader.byteAt(2) == 0x6A) && (reader.byteAt(3) == 0x95)) {
                return true;
            }
            return false;
        }),

    new FileFormat("bmp",
        "Windows or OS/2 bitmap.",
        "",
        [ "fileBmp.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x42) && (reader.byteAt(1) == 0x4D) && (reader.byteAt(6) == 0x0) && (reader.byteAt(8) == 0x0)) {
                this.canPreviewNatively = true;
                return true;
            }
            return false;
        }),

    new FileFormat("", "", "",
        [ "fileRiff.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x52) && (reader.byteAt(1) == 0x49) && (reader.byteAt(2) == 0x46) && (reader.byteAt(3) == 0x46)) {
                var riffType = reader.getAsciiStringAt(8, 4);
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

    new FileFormat("raf",
        "Fujifilm raw image.",
        "",
        [ "tiff.js", "fileJpg.js", "fileRaf.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x46) && (reader.byteAt(1) == 0x55) && (reader.byteAt(2) == 0x4A) && (reader.byteAt(3) == 0x49)) {
                if ((reader.byteAt(12) == 0x52) && (reader.byteAt(13) == 0x41) && (reader.byteAt(14) == 0x57) && (reader.byteAt(15) == 0x20)
                    && (reader.byteAt(16) == 0x30) && (reader.byteAt(17) == 0x32) && (reader.byteAt(18) == 0x30) && (reader.byteAt(19) == 0x31)) {
                    return true;
                }
            }
            return false;
        }),

    new FileFormat("xpm",
        "X PixMap icon.",
        "",
        [ "fileXpm.js" ],
        function(reader) {
            if ((reader.byteAt(0) == 0x2F) && (reader.byteAt(1) == 0x2A) && (reader.byteAt(2) == 0x20)
                && (reader.byteAt(3) == 0x58) && (reader.byteAt(4) == 0x50) && (reader.byteAt(5) == 0x4D)) {
                return true;
            }
            return false;
        }),

    new FileFormat("dicom",
        "DICOM (Digital Imaging and Communications in Medicine) image.",
        "",
        [ "fileDicom.js" ],
        function(reader) {
            if ((reader.byteAt(0x80) == 0x44) && (reader.byteAt(0x81) == 0x49) && (reader.byteAt(0x82) == 0x43)
                && (reader.byteAt(0x83) == 0x4D) && (reader.byteAt(0x84) == 0x2) && (reader.byteAt(0x85) == 0x0)) {
                return true;
            }
            return false;
        }),

    new FileFormat("mp3",
        "MPEG-1 or MPEG-2 Audio Layer III.",
        "",
        [ "tiff.js", "fileJpg.js", "filePng.js", "fileMp3.js" ],
        function(reader) {
            if ((reader.byteAt(0x0) == 0x49) && (reader.byteAt(0x1) == 0x44) && (reader.byteAt(0x2) == 0x33)
                && (reader.byteAt(0x3) > 1) && (reader.byteAt(0x3) < 8)) {
                return true;
            }
            return false;
        }),

    new FileFormat("zip",
        "ZIP compressed file container.",
        "",
        [ "fileZip.js" ],
        function(reader) {
            if ((reader.byteAt(0x0) == 0x50) && (reader.byteAt(0x1) == 0x4B) && (reader.byteAt(0x2) == 0x3) && (reader.byteAt(0x3) == 0x4)) {
                return true;
            }
            return false;
        }),

    new FileFormat("psd",
        "Adobe Photoshop image.",
        "",
        [ "tiff.js", "fileJpg.js", "filePsd.js" ],
        function(reader) {
            if ((reader.byteAt(0x0) == 0x38) && (reader.byteAt(0x1) == 0x42) && (reader.byteAt(0x2) == 0x50) && (reader.byteAt(0x3) == 0x53) && (reader.byteAt(0x5) == 0x1)) {
                return true;
            }
            return false;
        })

];

var UnknownFileFormat = new FileFormat("", "Unknown file type", "", null, function() {
    return true;
});

function detectFileFormat(reader) {
    var detectedFormat = null;
    for (var i = 0; i < FileFormatList.length; i++) {
        if (FileFormatList[i].detectFunc(reader)) {
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

