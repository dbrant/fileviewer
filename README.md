# fileviewer.js
Javascript framework for parsing and viewing the internal binary structure of various file formats.

This allows the user to drag and drop local files onto the browser, and see a complete breakdown of the file's binary structure (using the FileReader API found in modern browsers). This also implies that we can:
- Decode and display graphics formats not supported natively by the browser.
- Show all kinds of metadata from files, such as Exif data from photos.
- Detect the correct internal format of the file, even if its extension is wrong.
- Assist digital preservation experts by ensuring that obsolete formats continue to be supported, in an open-source way.

## Current support

This currently supports the following formats: JPG, TIFF, PNG, BPG, PPM, PGM, PBM.

## Adding a custom format

This framework is intended to be extensible. That is, I've tried to make it as easy as possible to add a new file format:
- If you look in the `fileformats.js` file, you'll see the master `FileFormatList` structure that is composed of `FileFormat` objects.
- Make a duplicate of one of the `FileFormat` objects, and add it to the end of the `FileFormatList` structure.
- The parameters for the `FileFormat` are as follows, in order:
    - File extension associated with this format.
    - Short description of this format (preferably without HTML).
    - Long description of this format (HTML encouraged).
    - List of scripts to be loaded for processing this format. One of these scripts must contain a `parseFormat` function (see below).
    - Detector function for detecting whether a given file matches this format. This is where you can test the first few bytes of the file for any "magic" header that positively identifies the file as having your format. Return `true` for a positive match, or `false` otherwise.

### The `parseFormat` function

At least one of the scripts for processing your file format must contain a `parseFormat` function, with a single parameter that will be a `DataReader` object (see `datareader.js`).
The `DataReader` provides convenient, abstract methods for reading all kinds of data fields (in either endianness) from the file, at absolute offsets. You can also create a `DataStream` object (with a `DataReader` in the constructor) and read data sequentially, as in a stream.

The return value of the `parseFormat` function must be an instance of `ResultNode`, which is a key-value pair object (both of which are strings, which can contain HTML), which will be displayed in the output page. A `ResultNode` can have child `ResultNode`s, meaning that you can create a tree of resulting key-value pairs that fully describe the binary format that you're parsing.

----

Copyright &copy; 2016 Dmitry Brant

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
