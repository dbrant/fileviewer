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


    } catch(e) {
		console.log("Error while reading ZIP: " + e);
	}
	return results;
}


function zipReadContents(stream) {
    var headerSig;

    while (true) {
        //read local file header...
        headerSig = stream.readUIntLe();

        if (headerSig == 0x04034b50) {
            //compressed file data!
            var versionNeeded = stream.readShortLe();
            var flags = stream.readShortLe();
            var compressionMethod = stream.readShortLe();
            var lastModTime = stream.readShortLe();
            var lastModDate = stream.readShortLe();

            var crc32 = stream.readUIntLe();
            var compressedSize = stream.readUIntLe();
            var uncompressedSize = stream.readUIntLe();
            var fileNameLength = stream.readShortLe();
            var extraFieldLength = stream.readShortLe();

            //sanity
            if (fileNameLength > 10000) {
                break;
            }

            //read file name...
            var fileName = stream.readAsciiString(fileNameLength);

            if (fileList != null) {
                fileList.add(new String(tempBytes, 0, fileNameLength));
                if (maxFileList > 0)
                    if (fileList.size() >= maxFileList) break;
            }

            //read extra field...
            disk.readBytes(tempBytes, 0, extraFieldLength);
            fileSize += extraFieldLength;

            if (compressedSize < 0) {
                break;
            }
            fileSize += compressedSize;
            disk.skipBytes(compressedSize);

            //read data descriptor?
            if ((flags & 0x8) != 0) {
                int s = SearchForSig(disk, new byte[]{0x50, 0x4B, 0x7, 0x8}, 10000);
                if (s >= 0) {
                    fileSize += s;
                } else {
                    haveHeader = false;
                    break;
                }
            }
        } else if (headerSig == 0x08074b50L) {
            fileSize += 4;
            disk.readBytes(tempBytes, 0, 12);
            fileSize += 12;
            bytePtr = 0;

            long dataCrc32 = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long dataCompSize = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long dataUncompSize = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
        } else if (headerSig == 0x08064b50L) {
            fileSize += 4;
            //archive extra data record!
            disk.readBytes(tempBytes, 0, 4);
            fileSize += 4;
            bytePtr = 0;
            long extraFieldLength = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;

            if (extraFieldLength < 0) {
                break;
            }
            fileSize += extraFieldLength;
            disk.skipBytes(extraFieldLength);
        } else if (headerSig == 0x02014b50L) {
            fileSize += 4;
            //directory file header!
            disk.readBytes(tempBytes, 0, 42);
            fileSize += 42;
            bytePtr = 0;

            int versionMadeBy = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int versionNeeded = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int flags = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int compressionMethod = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int lastModTime = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int lastModDate = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;

            long crc32 = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long compressedSize = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long uncompressedSize = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            int fileNameLength = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int extraFieldLength = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int fileCommentLength = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int diskNumberStart = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int internalFileAttr = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            long externalFileAttr = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long relHeaderOffset = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;

            //read file name...
            disk.readBytes(tempBytes, 0, fileNameLength);
            fileSize += fileNameLength;

            //read extra field...
            disk.readBytes(tempBytes, 0, extraFieldLength);
            fileSize += extraFieldLength;

            //read file comment...
            disk.readBytes(tempBytes, 0, fileCommentLength);
            fileSize += fileCommentLength;
            haveHeader = true;
        } else if (headerSig == 0x05054b50L) {
            fileSize += 4;
            //digital signature!
            disk.readBytes(tempBytes, 0, 2);
            fileSize += 2;
            bytePtr = 0;
            int dataLength = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;

            if (dataLength < 0) {
                break;
            }
            disk.skipBytes(dataLength);
            fileSize += dataLength;
        } else if (headerSig == 0x06064b50L) {
            fileSize += 4;
            //zip64 end of central directory!
            disk.readBytes(tempBytes, 0, 8);
            fileSize += 8;
            bytePtr = 0;
            long sizeOfRecord = getLongLe(tempBytes, bytePtr);
            bytePtr += 8;

            if (sizeOfRecord > 0) {
                disk.skipBytes(sizeOfRecord);
                fileSize += sizeOfRecord;
            }
        } else if (headerSig == 0x07064b50L) {
            fileSize += 4;
            //zip64 end of central dir locator!
            disk.readBytes(tempBytes, 0, 16);
            fileSize += 16;
            bytePtr = 0;

            long numberofDisk = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long offsetToCentralDirRec = getLongLe(tempBytes, bytePtr);
            bytePtr += 8;
            long numTotalDisks = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
        } else if (headerSig == 0x06054b50L) {
            fileSize += 4;
            //directory file header!
            disk.readBytes(tempBytes, 0, 18);
            fileSize += 18;
            bytePtr = 0;

            int diskNumber = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int numDiskWithCentralDir = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int localCentralDirEntries = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            int totalCentralDirEntries = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;
            long sizeOfCentralDir = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            long offsetToCentralDir = getIntLe(tempBytes, bytePtr);
            bytePtr += 4;
            int zipCommentLength = getShortLe(tempBytes, bytePtr);
            bytePtr += 2;

            if (zipCommentLength < 0) {
                break;
            }
            fileSize += zipCommentLength;
            disk.skipBytes(zipCommentLength);
            haveHeader = true;
        } else {
            break;
        }

    }

}
