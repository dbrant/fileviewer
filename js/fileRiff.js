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
	var results = new ResultNode("RIFF structure");
	try {
		var stream = new DataStream(reader);

        var tempStr = stream.readAsciiString(4);
        if (tempStr != "RIFF") {
            throw "This is not a valid RIFF file.";
        }

        var totalSize = stream.readUIntBe();
        var riffType = stream.readAsciiString(4);

        var node = results.add("RIFF type", riffType);

        while (!stream.eof()) {
            var blockName = stream.readAsciiString(4);
            var blockSize = stream.readUIntLe();

            var subnode = node.add(blockName, blockSize.toString() + " bytes");

            if (blockName == "fmt " && (riffType == "WAVE" || riffType == "RMP3")) {
                subnode.add("Audio format", stream.readUShortLe());
                subnode.add("Number of channels", stream.readUShortLe());
                subnode.add("Sample rate", stream.readUIntLe());
                subnode.add("Byte rate", stream.readUIntLe());
                subnode.add("Block align", stream.readUShortLe());
                subnode.add("Bits per sample", stream.readUShortLe());
                blockSize -= 16;
            }

            stream.skip(blockSize);
        }

    } catch(e) {
		console.log("Error while reading RIFF: " + e);
	}
	return results;
}
