const vscode = require("vscode")
const path = require("path")
const { writeFileSync } = require("fs")
const { homedir } = require("os")

let lastUsedImageUri = vscode.Uri.file(path.resolve(homedir(), "Desktop/code.png"))

let panel
let shouldCopyEverything = false

const writeSerializedBlobToFile = (serializeBlob, fileName) => {
    const bytes = new Uint8Array(serializeBlob.split(","))
    writeFileSync(fileName, Buffer.from(bytes))
}

const grabSyntaxHighlightedText = ()=> {
    // have to use the clipboard to pass text around
    vscode.commands.executeCommand("editor.action.clipboardCopyWithSyntaxHighlightingAction")
    setTimeout(() => {
        panel.webview.postMessage({ type: "checkClipboard" })
    }, 0)
}

function activate(context) {
    
    shouldCopyEverything = true

    const panelHandlers = () =>
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case "polacode.shoot":
                        vscode.window
                            .showSaveDialog({
                                defaultUri: lastUsedImageUri,
                                filters: {
                                    Images: ["png"],
                                },
                            })
                            .then(uri => {
                                if (uri) {
                                    writeSerializedBlobToFile(message.data, uri.fsPath)
                                    lastUsedImageUri = uri
                                }
                            })
                        return

                    case "polacode._onmessage":
                        if (message.data.type === "updateBgColor") {
                            context.globalState.update("polacode.bgColor", message.data.data.bgColor)
                        } else if (message.data.type === "invalidPasteContent") {
                            vscode.window.showInformationMessage("Pasted content is invalid. Only copy from VS Code and check if your shortcuts for copy/paste have conflicts.")
                        }
                        return
                }
            },
            undefined,
            context.subscriptions
        )

    vscode.commands.registerCommand("polacode.activate", () => {
        panel = vscode.window.createWebviewPanel("polaCode", "PolaCode", vscode.ViewColumn.Two, {
            enableScripts: true,
        })

        panelHandlers()

        const fontFamily = vscode.workspace.getConfiguration("editor").fontFamily
        const bgColor = context.globalState.get("polacode.bgColor", "#2e3440")

        panel.webview.html = htmlString

        panel.webview.postMessage({
            type: "init",
            fontFamily,
            bgColor,
        })

        panel.onDidDispose(
            () => {
                shouldCopyEverything = false
            },
            null,
            context.subscriptions
        )
    })

    vscode.window.onDidChangeTextEditorSelection(eventObj => {
        if (eventObj.selections[0] && !eventObj.selections[0].isEmpty && shouldCopyEverything) {
            grabSyntaxHighlightedText()
            // do it again since sometimes theres delay problems
            setTimeout(grabSyntaxHighlightedText, 100)
            setTimeout(grabSyntaxHighlightedText, 200)
            setTimeout(grabSyntaxHighlightedText, 500)
            setTimeout(grabSyntaxHighlightedText, 1000)
        }
    })
}

const mainHtmlCode = function() {
    ;(function() {
        const vscode = acquireVsCodeApi()

        const snippetNode          = document.getElementById("snippet")
        const snippetContainerNode = document.getElementById("snippet-container")
        const obturateur           = document.getElementById("save")
        const shadowsOption        = document.getElementById("optShadows")
        const transparentOption    = document.getElementById("optTransparent")
        const colorOption          = document.getElementById("optColor")

        const getInitialHtml = fontFamily => {
            const cameraWithFlashEmoji = String.fromCodePoint(128248)
            const monoFontStack = `${fontFamily},SFMono-Regular,Consolas,DejaVu Sans Mono,Ubuntu Mono,Liberation Mono,Menlo,Courier,monospace`
            return `<meta charset="utf-8"><div style="color: #d8dee9;background-color: #2e3440; font-family: ${monoFontStack};font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">0. Run command \`Polacode ${cameraWithFlashEmoji}\`</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">1. Copy some code</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">2. Paste into Polacode view</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">3. Click the button ${cameraWithFlashEmoji}</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div></div></div>`
        }

        const serializeBlob = (blob, cb) => {
            const fileReader = new FileReader()

            fileReader.onload = () => {
                const bytes = new Uint8Array(fileReader.result)
                cb(Array.from(bytes).join(","))
            }

            function getBrightness(color) {
                const rgb = this.toRgb()
                return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
            }

            fileReader.readAsArrayBuffer(blob)
        }

        function postMessage(type, data) {
            vscode.postMessage({
                command: "polacode._onmessage",
                data: { type, data },
            })
        }
        function shoot(serializedBlob) {
            vscode.postMessage({
                command: "polacode.shoot",
                data: serializedBlob,
            })
        }

        function getBrightness(hexColor) {
            try {
                const rgb = parseInt(hexColor.slice(1), 16)
                const r = (rgb >> 16) & 0xff
                const g = (rgb >> 8) & 0xff
                const b = (rgb >> 0) & 0xff
                return (r * 299 + g * 587 + b * 114) / 1000
            } catch (e) {}
            return 127
        }
        function isDark(hexColor) {
            return getBrightness(hexColor) < 128
        }
        function getSnippetBgColor(html) {
            let match = html.match(/background-color: (#[a-fA-F0-9]+)/)
            return match && match[1]
        }

        function updateEnvironment(snippetBgColor) {
            // update snippet bg color
            document.getElementById("snippet").style.backgroundColor = snippetBgColor

            // update backdrop color
            if (isDark(snippetBgColor)) {
                snippetContainerNode.style.backgroundColor = "transparent"
            } else {
                snippetContainerNode.style.background = "none"
            }
        }

        function getMinIndent(code) {
            const arr = code.split("\n")

            let minIndentCount = Number.MAX_VALUE
            for (let i = 0; i < arr.length; i++) {
                const wsCount = arr[i].search(/\S/)
                if (wsCount !== -1) {
                    if (wsCount < minIndentCount) {
                        minIndentCount = wsCount
                    }
                }
            }

            return minIndentCount
        }

        function stripInitialIndent(html, indent) {
            const doc = new DOMParser().parseFromString(html, "text/html")
            const initialSpans = doc.querySelectorAll("div > div span:first-child")
            for (let i = 0; i < initialSpans.length; i++) {
                try {
                    initialSpans[i].textContent = initialSpans[i].textContent.slice(indent)
                } catch(e) {}
            }
            return doc.body.innerHTML
        }

        function updateCode(innerHTML, code) {
            const minIndent = getMinIndent(code)
            const snippetBgColor = getSnippetBgColor(innerHTML)
            postMessage("updateBgColor", { bgColor: snippetBgColor })
            updateEnvironment(snippetBgColor)

            if (minIndent !== 0) {
                snippetNode.innerHTML = stripInitialIndent(innerHTML, minIndent)
            } else {
                snippetNode.innerHTML = innerHTML
            }
        }

        shadowsOption.addEventListener("change", () => {
            const OPT_DISABLED_CLASS = "snippet--no-shadows"

            if (!shadowsOption.checked) snippetNode.classList.add(OPT_DISABLED_CLASS)
            else snippetNode.classList.remove(OPT_DISABLED_CLASS)
        })

        transparentOption.addEventListener("change", () => {
            if (transparentOption.checked) {
                snippetContainerNode.style.backgroundColor = "transparent"
                colorOption.disabled = true
            } else {
                colorOption.disabled = false
                snippetContainerNode.style.backgroundColor = colorOption.value
            }
        })

        colorOption.addEventListener("keydown", () => {
            setTimeout(() => (snippetContainerNode.style.backgroundColor = colorOption.value), 0)
        })

        obturateur.addEventListener("click", () => {
            const width = snippetContainerNode.offsetWidth * 2
            const height = snippetContainerNode.offsetHeight * 2
            const config = {
                width,
                height,
                style: {
                    transform: "scale(2)",
                    "transform-origin": "left top",
                },
            }

            domtoimage.toBlob(snippetContainerNode, config).then(blob => {
                serializeBlob(blob, serializedBlob => {
                    shoot(serializedBlob)
                })
            })
        })

        let isInAnimation = false

        obturateur.addEventListener("mouseover", () => {
            if (!isInAnimation) {
                isInAnimation = true

                new Vivus(
                    "save",
                    {
                        duration: 40,
                        onReady: () => {
                            obturateur.className = "obturateur filling"
                        },
                    },
                    () => {
                        setTimeout(() => {
                            isInAnimation = false
                            obturateur.className = "obturateur"
                        }, 700)
                    }
                )
            }
        })

        window.addEventListener("message", ({ data }) => {
            console.debug(`message data is:`,data)
            if (data && data.type) {
                if (data.type === "init") {
                    const { fontFamily, bgColor } = data

                    const initialHtml = getInitialHtml(fontFamily)
                    snippetNode.innerHTML = initialHtml

                    // update backdrop color, using bgColor from last pasted snippet
                    // cannot deduce from initialHtml since it's always using Nord color
                    if (isDark(bgColor)) {
                        snippetContainerNode.style.backgroundColor = "transparent"
                    } else {
                        snippetContainerNode.style.background = "none"
                    }

                    snippetContainerNode.style.opacity = "1"
                } else if (data.type === "checkClipboard") {
                    document.execCommand("paste")
                }
            }
        })

        document.addEventListener("paste", e => {
            const innerHTML = e.clipboardData.getData("text/html")
            const code      = e.clipboardData.getData("text/plain")
            if (code.trim().length > 0) {
                updateCode(innerHTML, code)
            }
        })
    })()
}

const defineDomToImage = function(){

    !(function (a) {
        "use strict"
        function b(a, b) {
            function c(a) {
                return (
                    b.bgcolor && (a.style.backgroundColor = b.bgcolor),
                    b.width && (a.style.width = b.width + "px"),
                    b.height && (a.style.height = b.height + "px"),
                    b.style &&
                        Object.keys(b.style).forEach(function (c) {
                            a.style[c] = b.style[c]
                        }),
                    a
                )
            }
            return (
                (b = b || {}),
                g(b),
                Promise.resolve(a)
                    .then(function (a) {
                        return i(a, b.filter, !0)
                    })
                    .then(j)
                    .then(k)
                    .then(c)
                    .then(function (c) {
                        return l(c, b.width || q.width(a), b.height || q.height(a))
                    })
            )
        }
        function c(a, b) {
            return h(a, b || {}).then(function (b) {
                return b.getContext("2d").getImageData(0, 0, q.width(a), q.height(a)).data
            })
        }
        function d(a, b) {
            return h(a, b || {}).then(function (a) {
                return a.toDataURL()
            })
        }
        function e(a, b) {
            return (
                (b = b || {}),
                h(a, b).then(function (a) {
                    return a.toDataURL("image/jpeg", b.quality || 1)
                })
            )
        }
        function f(a, b) {
            return h(a, b || {}).then(q.canvasToBlob)
        }
        function g(a) {
            "undefined" == typeof a.imagePlaceholder ? (v.impl.options.imagePlaceholder = u.imagePlaceholder) : (v.impl.options.imagePlaceholder = a.imagePlaceholder), "undefined" == typeof a.cacheBust ? (v.impl.options.cacheBust = u.cacheBust) : (v.impl.options.cacheBust = a.cacheBust)
        }
        function h(a, c) {
            function d(a) {
                var b = document.createElement("canvas")
                if (((b.width = c.width || q.width(a)), (b.height = c.height || q.height(a)), c.bgcolor)) {
                    var d = b.getContext("2d")
                    ;(d.fillStyle = c.bgcolor), d.fillRect(0, 0, b.width, b.height)
                }
                return b
            }
            return b(a, c)
                .then(q.makeImage)
                .then(q.delay(100))
                .then(function (b) {
                    var c = d(a)
                    return c.getContext("2d").drawImage(b, 0, 0), c
                })
        }
        function i(a, b, c) {
            function d(a) {
                return a instanceof HTMLCanvasElement ? q.makeImage(a.toDataURL()) : a.cloneNode(!1)
            }
            function e(a, b, c) {
                function d(a, b, c) {
                    var d = Promise.resolve()
                    return (
                        b.forEach(function (b) {
                            d = d
                                .then(function () {
                                    return i(b, c)
                                })
                                .then(function (b) {
                                    b && a.appendChild(b)
                                })
                        }),
                        d
                    )
                }
                var e = a.childNodes
                return 0 === e.length
                    ? Promise.resolve(b)
                    : d(b, q.asArray(e), c).then(function () {
                        return b
                    })
            }
            function f(a, b) {
                function c() {
                    function c(a, b) {
                        function c(a, b) {
                            q.asArray(a).forEach(function (c) {
                                b.setProperty(c, a.getPropertyValue(c), a.getPropertyPriority(c))
                            })
                        }
                        a.cssText ? (b.cssText = a.cssText) : c(a, b)
                    }
                    c(window.getComputedStyle(a), b.style)
                }
                function d() {
                    function c(c) {
                        function d(a, b, c) {
                            function d(a) {
                                var b = a.getPropertyValue("content")
                                return a.cssText + " content: " + b + ";"
                            }
                            function e(a) {
                                function b(b) {
                                    return b + ": " + a.getPropertyValue(b) + (a.getPropertyPriority(b) ? " !important" : "")
                                }
                                return q.asArray(a).map(b).join("; ") + ";"
                            }
                            var f = "." + a + ":" + b,
                                g = c.cssText ? d(c) : e(c)
                            return document.createTextNode(f + "{" + g + "}")
                        }
                        var e = window.getComputedStyle(a, c),
                            f = e.getPropertyValue("content")
                        if ("" !== f && "none" !== f) {
                            var g = q.uid()
                            b.className = b.className + " " + g
                            var h = document.createElement("style")
                            h.appendChild(d(g, c, e)), b.appendChild(h)
                        }
                    }
                    ;[":before", ":after"].forEach(function (a) {
                        c(a)
                    })
                }
                function e() {
                    a instanceof HTMLTextAreaElement && (b.innerHTML = a.value), a instanceof HTMLInputElement && b.setAttribute("value", a.value)
                }
                function f() {
                    b instanceof SVGElement &&
                        (b.setAttribute("xmlns", "http://www.w3.org/2000/svg"),
                        b instanceof SVGRectElement &&
                            ["width", "height"].forEach(function (a) {
                                var c = b.getAttribute(a)
                                c && b.style.setProperty(a, c)
                            }))
                }
                return b instanceof Element
                    ? Promise.resolve()
                        .then(c)
                        .then(d)
                        .then(e)
                        .then(f)
                        .then(function () {
                            return b
                        })
                    : b
            }
            return c || !b || b(a)
                ? Promise.resolve(a)
                    .then(d)
                    .then(function (c) {
                        return e(a, c, b)
                    })
                    .then(function (b) {
                        return f(a, b)
                    })
                : Promise.resolve()
        }
        function j(a) {
            return s.resolveAll().then(function (b) {
                var c = document.createElement("style")
                return a.appendChild(c), c.appendChild(document.createTextNode(b)), a
            })
        }
        function k(a) {
            return t.inlineAll(a).then(function () {
                return a
            })
        }
        function l(a, b, c) {
            return Promise.resolve(a)
                .then(function (a) {
                    return a.setAttribute("xmlns", "http://www.w3.org/1999/xhtml"), new XMLSerializer().serializeToString(a)
                })
                .then(q.escapeXhtml)
                .then(function (a) {
                    return '<foreignObject x="0" y="0" width="100%" height="100%">' + a + "</foreignObject>"
                })
                .then(function (a) {
                    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + b + '" height="' + c + '">' + a + "</svg>"
                })
                .then(function (a) {
                    return "data:image/svg+xml;charset=utf-8," + a
                })
        }
        function m() {
            function a() {
                var a = "application/font-woff",
                    b = "image/jpeg"
                return { woff: a, woff2: a, ttf: "application/font-truetype", eot: "application/vnd.ms-fontobject", png: "image/png", jpg: b, jpeg: b, gif: "image/gif", tiff: "image/tiff", svg: "image/svg+xml" }
            }
            function b(a) {
                var b = /\.([^\.\/]*?)$/g.exec(a)
                return b ? b[1] : ""
            }
            function c(c) {
                var d = b(c).toLowerCase()
                return a()[d] || ""
            }
            function d(a) {
                return a.search(/^(data:)/) !== -1
            }
            function e(a) {
                return new Promise(function (b) {
                    for (var c = window.atob(a.toDataURL().split(",")[1]), d = c.length, e = new Uint8Array(d), f = 0; f < d; f++) e[f] = c.charCodeAt(f)
                    b(new Blob([e], { type: "image/png" }))
                })
            }
            function f(a) {
                return a.toBlob
                    ? new Promise(function (b) {
                        a.toBlob(b)
                    })
                    : e(a)
            }
            function g(a, b) {
                var c = document.implementation.createHTMLDocument(),
                    d = c.createElement("base")
                c.head.appendChild(d)
                var e = c.createElement("a")
                return c.body.appendChild(e), (d.href = b), (e.href = a), e.href
            }
            function h() {
                var a = 0
                return function () {
                    function b() {
                        return ("0000" + ((Math.random() * Math.pow(36, 4)) << 0).toString(36)).slice(-4)
                    }
                    return "u" + b() + a++
                }
            }
            function i(a) {
                return new Promise(function (b, c) {
                    var d = new Image()
                    ;(d.onload = function () {
                        b(d)
                    }),
                        (d.onerror = c),
                        (d.src = a)
                })
            }
            function j(a) {
                var b = 3e4
                return (
                    v.impl.options.cacheBust && (a += (/\?/.test(a) ? "&" : "?") + new Date().getTime()),
                    new Promise(function (c) {
                        function d() {
                            if (4 === g.readyState) {
                                if (200 !== g.status) return void (h ? c(h) : f("cannot fetch resource: " + a + ", status: " + g.status))
                                var b = new FileReader()
                                ;(b.onloadend = function () {
                                    var a = b.result.split(/,/)[1]
                                    c(a)
                                }),
                                    b.readAsDataURL(g.response)
                            }
                        }
                        function e() {
                            h ? c(h) : f("timeout of " + b + "ms occured while fetching resource: " + a)
                        }
                        function f(a) {
                            console.error(a), c("")
                        }
                        var g = new XMLHttpRequest()
                        ;(g.onreadystatechange = d), (g.ontimeout = e), (g.responseType = "blob"), (g.timeout = b), g.open("GET", a, !0), g.send()
                        var h
                        if (v.impl.options.imagePlaceholder) {
                            var i = v.impl.options.imagePlaceholder.split(/,/)
                            i && i[1] && (h = i[1])
                        }
                    })
                )
            }
            function k(a, b) {
                return "data:" + b + ";base64," + a
            }
            function l(a) {
                return a.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1")
            }
            function m(a) {
                return function (b) {
                    return new Promise(function (c) {
                        setTimeout(function () {
                            c(b)
                        }, a)
                    })
                }
            }
            function n(a) {
                for (var b = [], c = a.length, d = 0; d < c; d++) b.push(a[d])
                return b
            }
            function o(a) {
                return a.replace(/#/g, "%23").replace(/\n/g, "%0A")
            }
            function p(a) {
                var b = r(a, "border-left-width"),
                    c = r(a, "border-right-width")
                return a.scrollWidth + b + c
            }
            function q(a) {
                var b = r(a, "border-top-width"),
                    c = r(a, "border-bottom-width")
                return a.scrollHeight + b + c
            }
            function r(a, b) {
                var c = window.getComputedStyle(a).getPropertyValue(b)
                return parseFloat(c.replace("px", ""))
            }
            return { escape: l, parseExtension: b, mimeType: c, dataAsUrl: k, isDataUrl: d, canvasToBlob: f, resolveUrl: g, getAndEncode: j, uid: h(), delay: m, asArray: n, escapeXhtml: o, makeImage: i, width: p, height: q }
        }
        function n() {
            function a(a) {
                return a.search(e) !== -1
            }
            function b(a) {
                for (var b, c = []; null !== (b = e.exec(a)); ) c.push(b[1])
                return c.filter(function (a) {
                    return !q.isDataUrl(a)
                })
            }
            function c(a, b, c, d) {
                function e(a) {
                    return new RegExp("(url\\(['\"]?)(" + q.escape(a) + ")(['\"]?\\))", "g")
                }
                return Promise.resolve(b)
                    .then(function (a) {
                        return c ? q.resolveUrl(a, c) : a
                    })
                    .then(d || q.getAndEncode)
                    .then(function (a) {
                        return q.dataAsUrl(a, q.mimeType(b))
                    })
                    .then(function (c) {
                        return a.replace(e(b), "$1" + c + "$3")
                    })
            }
            function d(d, e, f) {
                function g() {
                    return !a(d)
                }
                return g()
                    ? Promise.resolve(d)
                    : Promise.resolve(d)
                        .then(b)
                        .then(function (a) {
                            var b = Promise.resolve(d)
                            return (
                                a.forEach(function (a) {
                                    b = b.then(function (b) {
                                        return c(b, a, e, f)
                                    })
                                }),
                                b
                            )
                        })
            }
            var e = /url\(['"]?([^'"]+?)['"]?\)/g
            return { inlineAll: d, shouldProcess: a, impl: { readUrls: b, inline: c } }
        }
        function o() {
            function a() {
                return b(document)
                    .then(function (a) {
                        return Promise.all(
                            a.map(function (a) {
                                return a.resolve()
                            })
                        )
                    })
                    .then(function (a) {
                        return a.join("\n")
                    })
            }
            function b() {
                function a(a) {
                    return a
                        .filter(function (a) {
                            return a.type === CSSRule.FONT_FACE_RULE
                        })
                        .filter(function (a) {
                            return r.shouldProcess(a.style.getPropertyValue("src"))
                        })
                }
                function b(a) {
                    var b = []
                    return (
                        a.forEach(function (a) {
                            try {
                                q.asArray(a.cssRules || []).forEach(b.push.bind(b))
                            } catch (c) {
                                console.log("Error while reading CSS rules from " + a.href, c.toString())
                            }
                        }),
                        b
                    )
                }
                function c(a) {
                    return {
                        resolve: function () {
                            var b = (a.parentStyleSheet || {}).href
                            return r.inlineAll(a.cssText, b)
                        },
                        src: function () {
                            return a.style.getPropertyValue("src")
                        },
                    }
                }
                return Promise.resolve(q.asArray(document.styleSheets))
                    .then(b)
                    .then(a)
                    .then(function (a) {
                        return a.map(c)
                    })
            }
            return { resolveAll: a, impl: { readAll: b } }
        }
        function p() {
            function a(a) {
                function b(b) {
                    return q.isDataUrl(a.src)
                        ? Promise.resolve()
                        : Promise.resolve(a.src)
                            .then(b || q.getAndEncode)
                            .then(function (b) {
                                return q.dataAsUrl(b, q.mimeType(a.src))
                            })
                            .then(function (b) {
                                return new Promise(function (c, d) {
                                    ;(a.onload = c), (a.onerror = d), (a.src = b)
                                })
                            })
                }
                return { inline: b }
            }
            function b(c) {
                function d(a) {
                    var b = a.style.getPropertyValue("background")
                    return b
                        ? r
                            .inlineAll(b)
                            .then(function (b) {
                                a.style.setProperty("background", b, a.style.getPropertyPriority("background"))
                            })
                            .then(function () {
                                return a
                            })
                        : Promise.resolve(a)
                }
                return c instanceof Element
                    ? d(c).then(function () {
                        return c instanceof HTMLImageElement
                            ? a(c).inline()
                            : Promise.all(
                                    q.asArray(c.childNodes).map(function (a) {
                                        return b(a)
                                    })
                                )
                    })
                    : Promise.resolve(c)
            }
            return { inlineAll: b, impl: { newImage: a } }
        }
        var q = m(),
            r = n(),
            s = o(),
            t = p(),
            u = { imagePlaceholder: void 0, cacheBust: !1 },
            v = { toSvg: b, toPng: d, toJpeg: e, toBlob: f, toPixelData: c, impl: { fontFaces: s, images: t, util: q, inliner: r, options: {} } }
        "undefined" != typeof module ? (module.exports = v) : (a.domtoimage = v)
    })(this)
}

/**
* vivus - JavaScript library to make drawing animation on SVG
* @version v0.4.2
* @link https://github.com/maxwellito/vivus
* @license MIT
*/
const defineVivus = function() {
    "use strict"
    
    !(function () {
        function t(t) {
            if ("undefined" == typeof t) throw new Error('Pathformer [constructor]: "element" parameter is required')
            if (t.constructor === String && ((t = document.getElementById(t)), !t)) throw new Error('Pathformer [constructor]: "element" parameter is not related to an existing ID')
            if (!(t instanceof window.SVGElement || t instanceof window.SVGGElement || /^svg$/i.test(t.nodeName))) throw new Error('Pathformer [constructor]: "element" parameter must be a string or a SVGelement')
            ;(this.el = t), this.scan(t)
        }
        function e(t, e, n) {
            r(), (this.isReady = !1), this.setElement(t, e), this.setOptions(e), this.setCallback(n), this.isReady && this.init()
        }
        ;(t.prototype.TYPES = ["line", "ellipse", "circle", "polygon", "polyline", "rect"]),
            (t.prototype.ATTR_WATCH = ["cx", "cy", "points", "r", "rx", "ry", "x", "x1", "x2", "y", "y1", "y2"]),
            (t.prototype.scan = function (t) {
                for (var e, r, n, i, a = t.querySelectorAll(this.TYPES.join(",")), o = 0; o < a.length; o++) (r = a[o]), (e = this[r.tagName.toLowerCase() + "ToPath"]), (n = e(this.parseAttr(r.attributes))), (i = this.pathMaker(r, n)), r.parentNode.replaceChild(i, r)
            }),
            (t.prototype.lineToPath = function (t) {
                var e = {},
                    r = t.x1 || 0,
                    n = t.y1 || 0,
                    i = t.x2 || 0,
                    a = t.y2 || 0
                return (e.d = "M" + r + "," + n + "L" + i + "," + a), e
            }),
            (t.prototype.rectToPath = function (t) {
                var e = {},
                    r = parseFloat(t.x) || 0,
                    n = parseFloat(t.y) || 0,
                    i = parseFloat(t.width) || 0,
                    a = parseFloat(t.height) || 0
                if (t.rx || t.ry) {
                    var o = parseInt(t.rx, 10) || -1,
                        s = parseInt(t.ry, 10) || -1
                    ;(o = Math.min(Math.max(0 > o ? s : o, 0), i / 2)), (s = Math.min(Math.max(0 > s ? o : s, 0), a / 2)), (e.d = "M " + (r + o) + "," + n + " L " + (r + i - o) + "," + n + " A " + o + "," + s + ",0,0,1," + (r + i) + "," + (n + s) + " L " + (r + i) + "," + (n + a - s) + " A " + o + "," + s + ",0,0,1," + (r + i - o) + "," + (n + a) + " L " + (r + o) + "," + (n + a) + " A " + o + "," + s + ",0,0,1," + r + "," + (n + a - s) + " L " + r + "," + (n + s) + " A " + o + "," + s + ",0,0,1," + (r + o) + "," + n)
                } else e.d = "M" + r + " " + n + " L" + (r + i) + " " + n + " L" + (r + i) + " " + (n + a) + " L" + r + " " + (n + a) + " Z"
                return e
            }),
            (t.prototype.polylineToPath = function (t) {
                var e,
                    r,
                    n = {},
                    i = t.points.trim().split(" ")
                if (-1 === t.points.indexOf(",")) {
                    var a = []
                    for (e = 0; e < i.length; e += 2) a.push(i[e] + "," + i[e + 1])
                    i = a
                }
                for (r = "M" + i[0], e = 1; e < i.length; e++) -1 !== i[e].indexOf(",") && (r += "L" + i[e])
                return (n.d = r), n
            }),
            (t.prototype.polygonToPath = function (e) {
                var r = t.prototype.polylineToPath(e)
                return (r.d += "Z"), r
            }),
            (t.prototype.ellipseToPath = function (t) {
                var e = {},
                    r = parseFloat(t.rx) || 0,
                    n = parseFloat(t.ry) || 0,
                    i = parseFloat(t.cx) || 0,
                    a = parseFloat(t.cy) || 0,
                    o = i - r,
                    s = a,
                    h = parseFloat(i) + parseFloat(r),
                    l = a
                return (e.d = "M" + o + "," + s + "A" + r + "," + n + " 0,1,1 " + h + "," + l + "A" + r + "," + n + " 0,1,1 " + o + "," + l), e
            }),
            (t.prototype.circleToPath = function (t) {
                var e = {},
                    r = parseFloat(t.r) || 0,
                    n = parseFloat(t.cx) || 0,
                    i = parseFloat(t.cy) || 0,
                    a = n - r,
                    o = i,
                    s = parseFloat(n) + parseFloat(r),
                    h = i
                return (e.d = "M" + a + "," + o + "A" + r + "," + r + " 0,1,1 " + s + "," + h + "A" + r + "," + r + " 0,1,1 " + a + "," + h), e
            }),
            (t.prototype.pathMaker = function (t, e) {
                var r,
                    n,
                    i = document.createElementNS("http://www.w3.org/2000/svg", "path")
                for (r = 0; r < t.attributes.length; r++) (n = t.attributes[r]), -1 === this.ATTR_WATCH.indexOf(n.name) && i.setAttribute(n.name, n.value)
                for (r in e) i.setAttribute(r, e[r])
                return i
            }),
            (t.prototype.parseAttr = function (t) {
                for (var e, r = {}, n = 0; n < t.length; n++) {
                    if (((e = t[n]), -1 !== this.ATTR_WATCH.indexOf(e.name) && -1 !== e.value.indexOf("%"))) throw new Error("Pathformer [parseAttr]: a SVG shape got values in percentage. This cannot be transformed into 'path' tags. Please use 'viewBox'.")
                    r[e.name] = e.value
                }
                return r
            })
        var r, n, i, a
        ;(e.LINEAR = function (t) {
            return t
        }),
            (e.EASE = function (t) {
                return -Math.cos(t * Math.PI) / 2 + 0.5
            }),
            (e.EASE_OUT = function (t) {
                return 1 - Math.pow(1 - t, 3)
            }),
            (e.EASE_IN = function (t) {
                return Math.pow(t, 3)
            }),
            (e.EASE_OUT_BOUNCE = function (t) {
                var e = -Math.cos(0.5 * t * Math.PI) + 1,
                    r = Math.pow(e, 1.5),
                    n = Math.pow(1 - t, 2),
                    i = -Math.abs(Math.cos(2.5 * r * Math.PI)) + 1
                return 1 - n + i * n
            }),
            (e.prototype.setElement = function (t, e) {
                if ("undefined" == typeof t) throw new Error('Vivus [constructor]: "element" parameter is required')
                if (t.constructor === String && ((t = document.getElementById(t)), !t)) throw new Error('Vivus [constructor]: "element" parameter is not related to an existing ID')
                if (((this.parentEl = t), e && e.file)) {
                    var r = document.createElement("object")
                    r.setAttribute("type", "image/svg+xml"), r.setAttribute("data", e.file), r.setAttribute("built-by-vivus", "true"), t.appendChild(r), (t = r)
                }
                switch (t.constructor) {
                    case window.SVGSVGElement:
                    case window.SVGElement:
                    case window.SVGGElement:
                        ;(this.el = t), (this.isReady = !0)
                        break
                    case window.HTMLObjectElement:
                        var n, i
                        ;(i = this),
                            (n = function (e) {
                                if (!i.isReady) {
                                    if (((i.el = t.contentDocument && t.contentDocument.querySelector("svg")), !i.el && e)) throw new Error("Vivus [constructor]: object loaded does not contain any SVG")
                                    return i.el ? (t.getAttribute("built-by-vivus") && (i.parentEl.insertBefore(i.el, t), i.parentEl.removeChild(t), i.el.setAttribute("width", "100%"), i.el.setAttribute("height", "100%")), (i.isReady = !0), i.init(), !0) : void 0
                                }
                            }),
                            n() || t.addEventListener("load", n)
                        break
                    default:
                        throw new Error('Vivus [constructor]: "element" parameter is not valid (or miss the "file" attribute)')
                }
            }),
            (e.prototype.setOptions = function (t) {
                var r = ["delayed", "sync", "async", "nsync", "oneByOne", "scenario", "scenario-sync"],
                    n = ["inViewport", "manual", "autostart"]
                if (void 0 !== t && t.constructor !== Object) throw new Error('Vivus [constructor]: "options" parameter must be an object')
                if (((t = t || {}), t.type && -1 === r.indexOf(t.type))) throw new Error("Vivus [constructor]: " + t.type + " is not an existing animation `type`")
                if (((this.type = t.type || r[0]), t.start && -1 === n.indexOf(t.start))) throw new Error("Vivus [constructor]: " + t.start + " is not an existing `start` option")
                if (((this.start = t.start || n[0]), (this.isIE = -1 !== window.navigator.userAgent.indexOf("MSIE") || -1 !== window.navigator.userAgent.indexOf("Trident/") || -1 !== window.navigator.userAgent.indexOf("Edge/")), (this.duration = a(t.duration, 120)), (this.delay = a(t.delay, null)), (this.dashGap = a(t.dashGap, 1)), (this.forceRender = t.hasOwnProperty("forceRender") ? !!t.forceRender : this.isIE), (this.reverseStack = !!t.reverseStack), (this.selfDestroy = !!t.selfDestroy), (this.onReady = t.onReady), (this.map = []), (this.frameLength = this.currentFrame = this.delayUnit = this.speed = this.handle = null), (this.ignoreInvisible = t.hasOwnProperty("ignoreInvisible") ? !!t.ignoreInvisible : !1), (this.animTimingFunction = t.animTimingFunction || e.LINEAR), (this.pathTimingFunction = t.pathTimingFunction || e.LINEAR), this.delay >= this.duration)) throw new Error("Vivus [constructor]: delay must be shorter than duration")
            }),
            (e.prototype.setCallback = function (t) {
                if (t && t.constructor !== Function) throw new Error('Vivus [constructor]: "callback" parameter must be a function')
                this.callback = t || function () {}
            }),
            (e.prototype.mapping = function () {
                var t, e, r, n, i, o, s, h
                for (h = o = s = 0, e = this.el.querySelectorAll("path"), t = 0; t < e.length; t++) (r = e[t]), this.isInvisible(r) || ((i = { el: r, length: Math.ceil(r.getTotalLength()) }), isNaN(i.length) ? window.console && console.warn && console.warn("Vivus [mapping]: cannot retrieve a path element length", r) : (this.map.push(i), (r.style.strokeDasharray = i.length + " " + (i.length + 2 * this.dashGap)), (r.style.strokeDashoffset = i.length + this.dashGap), (i.length += this.dashGap), (o += i.length), this.renderPath(t)))
                for (o = 0 === o ? 1 : o, this.delay = null === this.delay ? this.duration / 3 : this.delay, this.delayUnit = this.delay / (e.length > 1 ? e.length - 1 : 1), this.reverseStack && this.map.reverse(), t = 0; t < this.map.length; t++) {
                    switch (((i = this.map[t]), this.type)) {
                        case "delayed":
                            ;(i.startAt = this.delayUnit * t), (i.duration = this.duration - this.delay)
                            break
                        case "oneByOne":
                            ;(i.startAt = (s / o) * this.duration), (i.duration = (i.length / o) * this.duration)
                            break
                        case "sync":
                        case "async":
                        case "nsync":
                            ;(i.startAt = 0), (i.duration = this.duration)
                            break
                        case "scenario-sync":
                            ;(r = i.el), (n = this.parseAttr(r)), (i.startAt = h + (a(n["data-delay"], this.delayUnit) || 0)), (i.duration = a(n["data-duration"], this.duration)), (h = void 0 !== n["data-async"] ? i.startAt : i.startAt + i.duration), (this.frameLength = Math.max(this.frameLength, i.startAt + i.duration))
                            break
                        case "scenario":
                            ;(r = i.el), (n = this.parseAttr(r)), (i.startAt = a(n["data-start"], this.delayUnit) || 0), (i.duration = a(n["data-duration"], this.duration)), (this.frameLength = Math.max(this.frameLength, i.startAt + i.duration))
                    }
                    ;(s += i.length), (this.frameLength = this.frameLength || this.duration)
                }
            }),
            (e.prototype.drawer = function () {
                var t = this
                if (((this.currentFrame += this.speed), this.currentFrame <= 0)) this.stop(), this.reset()
                else {
                    if (!(this.currentFrame >= this.frameLength))
                        return (
                            this.trace(),
                            (this.handle = n(function () {
                                t.drawer()
                            })),
                            void 0
                        )
                    this.stop(), (this.currentFrame = this.frameLength), this.trace(), this.selfDestroy && this.destroy()
                }
                this.callback(this), this.instanceCallback && (this.instanceCallback(this), (this.instanceCallback = null))
            }),
            (e.prototype.trace = function () {
                var t, e, r, n
                for (n = this.animTimingFunction(this.currentFrame / this.frameLength) * this.frameLength, t = 0; t < this.map.length; t++) (r = this.map[t]), (e = (n - r.startAt) / r.duration), (e = this.pathTimingFunction(Math.max(0, Math.min(1, e)))), r.progress !== e && ((r.progress = e), (r.el.style.strokeDashoffset = Math.floor(r.length * (1 - e))), this.renderPath(t))
            }),
            (e.prototype.renderPath = function (t) {
                if (this.forceRender && this.map && this.map[t]) {
                    var e = this.map[t],
                        r = e.el.cloneNode(!0)
                    e.el.parentNode.replaceChild(r, e.el), (e.el = r)
                }
            }),
            (e.prototype.init = function () {
                ;(this.frameLength = 0), (this.currentFrame = 0), (this.map = []), new t(this.el), this.mapping(), this.starter(), this.onReady && this.onReady(this)
            }),
            (e.prototype.starter = function () {
                switch (this.start) {
                    case "manual":
                        return
                    case "autostart":
                        this.play()
                        break
                    case "inViewport":
                        var t = this,
                            e = function () {
                                t.isInViewport(t.parentEl, 1) && (t.play(), window.removeEventListener("scroll", e))
                            }
                        window.addEventListener("scroll", e), e()
                }
            }),
            (e.prototype.getStatus = function () {
                return 0 === this.currentFrame ? "start" : this.currentFrame === this.frameLength ? "end" : "progress"
            }),
            (e.prototype.reset = function () {
                return this.setFrameProgress(0)
            }),
            (e.prototype.finish = function () {
                return this.setFrameProgress(1)
            }),
            (e.prototype.setFrameProgress = function (t) {
                return (t = Math.min(1, Math.max(0, t))), (this.currentFrame = Math.round(this.frameLength * t)), this.trace(), this
            }),
            (e.prototype.play = function (t, e) {
                if (((this.instanceCallback = null), t && "function" == typeof t)) (this.instanceCallback = t), (t = null)
                else if (t && "number" != typeof t) throw new Error("Vivus [play]: invalid speed")
                return e && "function" == typeof e && !this.instanceCallback && (this.instanceCallback = e), (this.speed = t || 1), this.handle || this.drawer(), this
            }),
            (e.prototype.stop = function () {
                return this.handle && (i(this.handle), (this.handle = null)), this
            }),
            (e.prototype.destroy = function () {
                this.stop()
                var t, e
                for (t = 0; t < this.map.length; t++) (e = this.map[t]), (e.el.style.strokeDashoffset = null), (e.el.style.strokeDasharray = null), this.renderPath(t)
            }),
            (e.prototype.isInvisible = function (t) {
                var e,
                    r = t.getAttribute("data-ignore")
                return null !== r ? "false" !== r : this.ignoreInvisible ? ((e = t.getBoundingClientRect()), !e.width && !e.height) : !1
            }),
            (e.prototype.parseAttr = function (t) {
                var e,
                    r = {}
                if (t && t.attributes) for (var n = 0; n < t.attributes.length; n++) (e = t.attributes[n]), (r[e.name] = e.value)
                return r
            }),
            (e.prototype.isInViewport = function (t, e) {
                var r = this.scrollY(),
                    n = r + this.getViewportH(),
                    i = t.getBoundingClientRect(),
                    a = i.height,
                    o = r + i.top,
                    s = o + a
                return (e = e || 0), n >= o + a * e && s >= r
            }),
            (e.prototype.getViewportH = function () {
                var t = this.docElem.clientHeight,
                    e = window.innerHeight
                return e > t ? e : t
            }),
            (e.prototype.scrollY = function () {
                return window.pageYOffset || this.docElem.scrollTop
            }),
            (r = function () {
                e.prototype.docElem ||
                    ((e.prototype.docElem = window.document.documentElement),
                    (n = (function () {
                        return (
                            window.requestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.oRequestAnimationFrame ||
                            window.msRequestAnimationFrame ||
                            function (t) {
                                return window.setTimeout(t, 1e3 / 60)
                            }
                        )
                    })()),
                    (i = (function () {
                        return (
                            window.cancelAnimationFrame ||
                            window.webkitCancelAnimationFrame ||
                            window.mozCancelAnimationFrame ||
                            window.oCancelAnimationFrame ||
                            window.msCancelAnimationFrame ||
                            function (t) {
                                return window.clearTimeout(t)
                            }
                        )
                    })()))
            }),
            (a = function (t, e) {
                var r = parseInt(t, 10)
                return r >= 0 ? r : e
            }),
            "function" == typeof define && define.amd
                ? define([], function () {
                    return e
                })
                : "object" == typeof exports
                ? (module.exports = e)
                : (window.Vivus = e)
    })()
}

const htmlString = /*html*/`
    <html>
        <head>
            <style>
                html {
                    box-sizing: border-box;
                    padding-top: 32px;
                }

                #snippet-container {
                    background-color: transparent;
                    padding: 22px;
                    border-radius: 4px;
                    transition: opacity 0.4s;
                }

                #snippet {
                    display: flex;
                    padding: 18px;
                    padding-bottom: 22px;
                    border-radius: 5px;
                    box-shadow: rgba(0, 0, 0, 0.55) 0px 20px 68px;
                }

                .snippet--no-shadows {
                    box-shadow: none !important;
                }

                #snippet > div > div {
                    display: flex;
                    flex-wrap: wrap;
                }

                #save-container {
                    margin-top: 40px;
                    margin-bottom: 60px;
                    text-align: center;
                }

                .obturateur {
                    width: 64px;
                    height: 64px;
                }

                .obturateur * {
                    transition: stroke 0.4s;
                }

                .obturateur:not(.filling) path {
                    opacity: 0.5;
                }

                .options-container {
                    margin-bottom: 20px;
                    display: flex;
                    font-size: 1em;
                }

                .options-title {
                    padding: 1em 2em;
                }

                .options {
                    display: flex;
                    align-items: stretch;
                    border-right: none;
                    user-select: none;
                }

                .option {
                    align-self: stretch;
                    margin: 0.5em;
                }

                .option__label {
                    display: block;
                    position: relative;
                    transition: all 0.15s ease-out;
                    cursor: pointer;
                    padding: 1em 2em;
                    border-color: gray;
                    border: 1px solid;
                }

                .option > input[type="checkbox"] {
                    z-index: -10;
                    position: absolute;
                    opacity: 0;
                }

                .option > input[type="text"] {
                    margin-left: 5px;
                }

                input:checked + .option__label {
                    background-color: rgba(65, 105, 225, 1);
                    border-color: rgb(57, 93, 199);
                    color: #fff;
                }
            </style>
        </head>

        <body>
            <div class="options-container">
                <div class="options-title">Options</div>
                <div class="options">
                    <div class="option">
                        <input type="checkbox" name="optShadows" id="optShadows" checked />
                        <label for="optShadows" class="option__label"> Shadow </label>
                    </div>
                    <div class="option">
                        <input type="checkbox" name="optTransparent" id="optTransparent" checked />
                        <label for="optTransparent" class="option__label"> Transparent </label>
                    </div>
                    <div class="option">
                        <label for="optColor">Color</label>
                        <input type="text" name="optColor" id="optColor" placeholder="color" value="#f2f2f2" />
                    </div>
                </div>
            </div>

            <div id="snippet-container">
                <div id="snippet" style="color: #d8dee9; background-color: #2e3440; font-family: SFMono-Regular, Consolas, DejaVu Sans Mono, Ubuntu Mono, Liberation Mono, Menlo, Courier, monospace; font-weight: normal; font-size: 12px; line-height: 18px; white-space: pre">
                    <meta charset="utf-8" />
                    <div style="color: #d8dee9; background-color: #2e3440; font-family: Input Mono; font-weight: normal; font-size: 12px; line-height: 18px; white-space: pre">
                        <div><span style="color: #8fbcbb">console</span><span style="color: #eceff4">.</span><span style="color: #88c0d0">log</span><span style="color: #d8dee9">(</span><span style="color: #eceff4">'</span><span style="color: #a3be8c">1. Run command ${'`'}Polacode ?�� ${'`'}</span><span style="color: #eceff4">'</span><span style="color: #d8dee9">)</span></div>
                        <div><span style="color: #8fbcbb">console</span><span style="color: #eceff4">.</span><span style="color: #88c0d0">log</span><span style="color: #d8dee9">(</span><span style="color: #eceff4">'</span><span style="color: #a3be8c">2. Select Some Code</span><span style="color: #eceff4">'</span><span style="color: #d8dee9">)</span></div>
                        <div><span style="color: #8fbcbb">console</span><span style="color: #eceff4">.</span><span style="color: #88c0d0">log</span><span style="color: #d8dee9">(</span><span style="color: #eceff4">'</span><span style="color: #a3be8c">3. Click the button ?�� </span><span style="color: #eceff4">'</span><span style="color: #d8dee9">)</span></div>
                    </div>
                </div>
            </div>

            <div id="save-container">
                <svg id="save" class="obturateur" width="132px" height="132px" viewBox="0 0 132 132" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
                        <g id="obturateur" transform="translate(2.000000, 2.000000)" stroke-width="3">
                            <circle id="Oval" stroke="#4C566A" cx="64" cy="64" r="64"></circle>
                            <circle id="Oval" stroke="#4C566A" cx="64" cy="64" r="60.9706667"></circle>
                            <circle id="Oval" stroke="#4C566A" cx="64" cy="64" r="51.8734222"></circle>
                            <circle id="Oval" stroke="#D8DEE9" cx="64" cy="64" r="28.2595556"></circle>
                            <path d="M17.0965333,86.1788444 L40.5667556,48.1998222" id="Shape" stroke="#EBCB8B"></path>
                            <path d="M15.1509333,46.5180444 L58.6026667,36.2574222" id="Shape" stroke="#A3BE8C"></path>
                            <path d="M41.8204444,17.0965333 L79.8001778,40.5660444" id="Shape" stroke="#8FBCBB"></path>
                            <path d="M81.4819556,15.1502222 L91.7425778,58.6019556" id="Shape" stroke="#88C0D0"></path>
                            <path d="M110.902756,41.8197333 L87.4332444,79.8001778" id="Shape" stroke="#81A1C1"></path>
                            <path d="M112.848356,81.4819556 L69.3973333,91.7418667" id="Shape" stroke="#B48EAD"></path>
                            <path d="M86.1795556,110.902756 L48.1998222,87.4332444" id="Shape" stroke="#BF616A"></path>
                            <path d="M46.5187556,112.848356 L36.2574222,69.3973333" id="Shape" stroke="#D08770"></path>
                        </g>
                    </g>
                </svg>
            </div>

            <script>
                /*! dom-to-image 10-06-2017 */
                (${defineDomToImage.toString()})()
            </script>
            <script>
                /**
                * vivus - JavaScript library to make drawing animation on SVG
                * @version v0.4.2
                * @link https://github.com/maxwellito/vivus
                * @license MIT
                */
                (${defineVivus.toString()})()
            </script>
            <script>
                (${mainHtmlCode.toString()})()
            </script>
        </body>
    </html>
`

exports.activate = activate
