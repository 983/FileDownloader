# How does this work?

Go to [https://983.github.io/bookmarklet.htm](https://983.github.io/bookmarklet.htm) and follow the instructions.

Alternatively, create a bookmark with [this content](https://raw.githubusercontent.com/983/FileDownloader/master/bookmarklet.js). The bookmark should point to `javascript:...`, not to `https://...bookmarklet.js`.

# How does this work technically?

Instead of regular links like `https://...`, you can create links like

```
javascript:alert('Hello, World!')
```

to execute arbitrary javascript code in the context of the current website. You can even bookmark those links, which are then called a "bookmarklet".

Clicking on the bookmarklet while on a random website will activate it. This bookmarklet then scans the website for all `<img>` tags and tries to download their `img.src` attribute into an `Uint8Array` via `XMLHttpRequest`. The downloaded data is then written into an uncompressed ZIP archive.

For information about the structure of a ZIP file, see [this documentation](https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html) [Backup link](https://web.archive.org/web/20200517162823/https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html).

### TODO
* Handle cross origin requests.
* Support for more file types, maybe videos? (`.mp4`, `.webm`, `.m3u8`)
* Support infinite scroll somehow. Likely impossible to do in a general way, but can work for specific sites.
  * Imgur: Parse `https://imgur.com/ajaxalbums/getimages/<albumid>/hit.json`
