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

function parseFormat(reader)
{
	var results = new ResultNode("ZIP structure");
	try {
		var stream = new DataStream(reader);

        var fileList = [];
        zipReadContents(stream, results, fileList);

        for (var i = 0; i < fileList.length; i++) {
            //results.add(fileList[i]);
        }

    } catch(e) {
		console.log("Error while reading ZIP: " + e);
	}
	return results;
}

function zipReadContents(stream, results, fileList) {
    var headerSig;
    var versionNeeded, flags, compressionMethod;
    var lastModTime, lastModDate, crc32;
    var compressedSize, uncompressedSize, fileNameLength;
    var extraFieldLength;
    var node;

    while (!stream.eof()) {
        //read local file header...
        headerSig = stream.readUIntLe();

        if (headerSig == 0x04034b50) {
            //compressed file data!
            versionNeeded = stream.readUShortLe();
            flags = stream.readUShortLe();
            compressionMethod = stream.readUShortLe();
            lastModTime = stream.readUShortLe();
            lastModDate = stream.readUShortLe();

            crc32 = stream.readUIntLe();
            compressedSize = stream.readUIntLe();
            uncompressedSize = stream.readUIntLe();
            fileNameLength = stream.readUShortLe();
            extraFieldLength = stream.readUShortLe();

            //sanity
            if (fileNameLength > 10000) {
                break;
            }

            //read file name...
            var fileName = stream.readAsciiString(fileNameLength);

            node = results.add("Local file header");
            node.add("Name", fileName);
            node.add("Size (compressed)", compressedSize);
            node.add("Size (uncompressed)", uncompressedSize);

            if (fileList !== null) {
                fileList.push(fileName);
            }

            stream.seek(extraFieldLength, 1);
            stream.seek(compressedSize, 1);

            //read data descriptor?
            if ((flags & 0x8) != 0) {
                //int s = SearchForSig(disk, new byte[]{0x50, 0x4B, 0x7, 0x8}, 10000);
                //if (s >= 0) {
                //    fileSize += s;
                //} else {
                //    haveHeader = false;
                //    break;
                //}
            }
        } else if (headerSig == 0x08074b50) {

            var dataCrc32 = stream.readUIntLe();
            var dataCompSize = stream.readUIntLe();
            var dataUncompSize = stream.readUIntLe();

        } else if (headerSig == 0x08064b50) {

            //archive extra data record!
            extraFieldLength = stream.readUIntLe();
            stream.seek(extraFieldLength, 1);

        } else if (headerSig == 0x02014b50) {

            //directory file header!
            var versionMadeBy = stream.readUShortLe();
            versionNeeded = stream.readUShortLe();
            flags = stream.readUShortLe();
            compressionMethod = stream.readUShortLe();
            lastModTime = stream.readUShortLe();
            lastModDate = stream.readUShortLe();

            crc32 = stream.readUIntLe();
            compressedSize = stream.readUIntLe();
            uncompressedSize = stream.readUIntLe();
            fileNameLength = stream.readUShortLe();
            extraFieldLength = stream.readUShortLe();
            var fileCommentLength = stream.readUShortLe();
            var diskNumberStart = stream.readUShortLe();
            var internalFileAttr = stream.readUShortLe();
            var externalFileAttr = stream.readUIntLe();
            var relHeaderOffset = stream.readUIntLe();

            //read file name...
            stream.seek(fileNameLength, 1);

            //read extra field...
            stream.seek(extraFieldLength, 1);

            //read file comment...
            if (fileCommentLength < 4096) {
                var fileComment = stream.readAsciiString(fileCommentLength);
            } else {
                stream.seek(fileCommentLength, 1);
            }

        } else if (headerSig == 0x05054b50) {

            //digital signature!
            var dataLength = stream.readUShortLe();
            stream.seek(dataLength, 1);

        } else if (headerSig == 0x06064b50) {

            //zip64 end of central directory!
            var sizeOfRecord = stream.readLongLe();
            if (sizeOfRecord > 0) {
                stream.seek(sizeOfRecord, 1);
            }

        } else if (headerSig == 0x07064b50) {

            //zip64 end of central dir locator!
            var numberofDisk = stream.readUIntLe();
            var offsetToCentralDirRec = stream.readLongLe();
            var numTotalDisks = stream.readUIntLe();

        } else if (headerSig == 0x06054b50) {

            //directory file header!
            var diskNumber = stream.readUShortLe();
            var numDiskWithCentralDir = stream.readUShortLe();
            var localCentralDirEntries = stream.readUShortLe();
            var totalCentralDirEntries = stream.readUShortLe();
            var sizeOfCentralDir = stream.readUIntLe();
            var offsetToCentralDir = stream.readUIntLe();
            var zipCommentLength = stream.readUShortLe();

            if (zipCommentLength < 4096) {
                var zipComment = stream.readAsciiString(zipCommentLength);
            } else {
                stream.seek(zipCommentLength, 1);
            }

        } else {
            break;
        }
    }
}
