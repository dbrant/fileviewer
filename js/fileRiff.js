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

async function parseFormat(reader)
{
	var results = new ResultNode("RIFF structure");
	try {
		var stream = new DataStream(reader);

        var tempStr = await stream.readAsciiString(4);
        if (tempStr != "RIFF") {
            throw "This is not a valid RIFF file.";
        }

        var bigEndian = false;
        var totalSizeLe = await reader.uintLeAt(4) + 8;
        var totalSizeBe = await reader.uintBeAt(4) + 8;

        if (totalSizeBe > (reader.length() - 16) && totalSizeBe < (reader.length() + 16)) {
            bigEndian = true;
        }

        stream.seek(4, 1);
        var riffType = await stream.readAsciiString(4);

        var node = results.add("RIFF type", riffType);

        while (!stream.eof()) {
            var blockName = await stream.readAsciiString(4);
            var blockSize = bigEndian ? await stream.readUIntBe() : await stream.readUIntLe();

            var subnode = node.add(blockName, blockSize.toString() + " bytes");

            if (blockName == "fmt " && (riffType == "WAVE" || riffType == "RMP3")) {
                subnode.add("Audio format", await stream.readUShortLe());
                subnode.add("Number of channels", await stream.readUShortLe());
                subnode.add("Sample rate", await stream.readUIntLe());
                subnode.add("Byte rate", await stream.readUIntLe());
                subnode.add("Block align", await stream.readUShortLe());
                subnode.add("Bits per sample", await stream.readUShortLe());
                blockSize -= 16;
            }

            stream.skip(blockSize);
        }

    } catch(e) {
		console.log("Error while reading RIFF: " + e);
	}
	return results;
}