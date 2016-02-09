/*
 Copyright (c) 2016 Dmitry Brant.
 http://dmitrybrant.com

 BPG Javascript decoder by Fabrice Bellard
 http://bellard.org/bpg/
 http://webencoder.libbpg.org/show.html

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
	var results = new ResultNode("BPG structure");
	try {

        var img = new BPGDecoder(reader.getCanvasContext());
        img.load(reader.dataView.buffer);
        if (img.imageData !== undefined) {
            console.log("Got bitmap from BPG decoder...");

            results.add("Width", img.imageData.width);
            results.add("Height", img.imageData.height);
            reader.onGetPreviewBitmap(img.imageData);
        }

	} catch(e) {
		console.log("Error while reading BPG: " + e);
	}
	return results;
}

