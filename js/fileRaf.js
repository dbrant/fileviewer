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
	var results = new ResultNode("RAF structure");

	try {
        var stream = new DataStream(reader);

        var magicStr = await stream.readAsciiString(16);
        if (magicStr != "FUJIFILMCCD-RAW ") {
            throw "Invalid RAF header.";
        }

        stream.skip(0x44);

        var jpgOffset = await stream.readUIntBe();
        var jpgLength = await stream.readUIntBe();

        results.addResult(await parseJpgStructure(reader, jpgOffset));

        var thumbString = "data:image/png;base64," + base64FromArrayBuffer(await reader.getSliceAsArrayBuffer(jpgOffset, jpgLength), 0, jpgLength);
        reader.onGetPreviewImage(thumbString);

    } catch(e) {
		console.log("Error while reading RAF: " + e);
	}
    return results;
}


