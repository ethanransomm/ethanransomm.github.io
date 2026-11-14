/* ==========================================================================
 Reads config.js (window.SITE) and builds the page.
 ========================================================================== */

(function () {
  "use strict";

  var S = window.SITE;
  if (!S) {
    console.error(
      "config.js did not load. Check the <script> order in index.html.",
    );
    return;
  }

  var doc = document;
  var root = doc.documentElement;

  // ---- Helper functions ----------------------------------------------------

  // Build an element. props: class, text, or any attribute. null/false are skipped.
  function el(tag, props, kids) {
    var node = doc.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) {
      if (c) node.appendChild(c);
    });
    return node;
  }

  function byId(id) {
    return doc.getElementById(id);
  }
  function has(list) {
    return Array.isArray(list) && list.length > 0;
  }
  function isExternal(url) {
    return /^https?:\/\//i.test(url);
  }

  function setText(id, value) {
    var n = byId(id);
    if (n) n.textContent = value || "";
  }

  function mount(id, nodes) {
    var host = byId(id);
    if (!host) return null;
    while (host.firstChild) host.removeChild(host.firstChild);
    nodes.forEach(function (n) {
      if (n) host.appendChild(n);
    });
    return host;
  }

  function hideSection(id) {
    var n = byId(id);
    if (n) n.hidden = true;
  }

  function link(label, url, cls) {
    var ext = isExternal(url);
    return el("a", {
      href: url,
      class: cls,
      target: ext ? "_blank" : null,
      rel: ext ? "noopener noreferrer" : null,
      text: label,
    });
  }

  function chip(label) {
    return el("li", { class: "chip", text: label });
  }

  // 1 -> "01", for the project index
  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // Parse a string of SVG markup into real nodes. Safe here because every
  // string below is authored in this file, never user input.
  function markup(str, hostProps) {
    var host = el("div", hostProps || {});
    host.innerHTML = str;
    return host;
  }

  // ---- Model architecture diagrams -----------------------------------------
  // Three models, three drawings, each dictated by the structure of each respective model:
  //   nnU-Net ensemble  wired schematic: five signal lines converging on a mean
  //   SwinUNETR         tensor slabs: the window grid etched on a feature map
  //   U-Net++           wired schematic of the dense skip pathways
  // Every tab also has a "detail" view.

  var diagramUid = 0;
  var SC = ["full", "½", "¼", "⅛"];

  function esc(t) {
    return String(t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function pt(p) {
    return p[0].toFixed(1) + "," + p[1].toFixed(1);
  }

  // Buttons that sit under a drawing and drive it.
  function controls(items, labelText) {
    var row = el("div", {
      class: "d-controls",
      role: "group",
      "aria-label": labelText,
    });
    items.forEach(function (it) {
      row.appendChild(
        el("button", {
          type: "button",
          class: "d-btn",
          "data-key": it.key,
          "aria-pressed": it.on ? "true" : "false",
          text: it.text,
        }),
      );
    });
    return row;
  }

  function setPressed(row, key) {
    row.querySelectorAll(".d-btn").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        String(b.getAttribute("data-key") === key),
      );
    });
  }

  function svgOpen(uid, w, h, aria) {
    return (
      '<svg viewBox="0 0 ' +
      w +
      " " +
      h +
      '" role="group" aria-label="' +
      esc(aria) +
      '">' +
      "<defs>" +
      '<marker id="' +
      uid +
      '-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
      '<path class="dg-arrow" d="M0 0L10 5L0 10z"/></marker></defs>'
    );
  }

  // An isometric block: a footprint that shrinks with resolution and a
  // thickness that grows with channel count is what a feature map does.
  function iso(cx, cy, x, y, z) {
    return [cx + (x - y) * 0.866, cy + (x + y) * 0.5 - z];
  }

  function slab(cx, cy, half, thick, cls, attrs) {
    var tp = [
      iso(cx, cy, -half, -half, thick),
      iso(cx, cy, half, -half, thick),
      iso(cx, cy, half, half, thick),
      iso(cx, cy, -half, half, thick),
    ];
    var l0 = iso(cx, cy, -half, half, 0);
    var l1 = iso(cx, cy, half, half, 0);
    var r1 = iso(cx, cy, half, -half, 0);
    return (
      '<g class="dg-slab ' +
      cls +
      '" ' +
      (attrs || "") +
      ">" +
      '<polygon class="lft" points="' +
      [tp[3], tp[2], l1, l0].map(pt).join(" ") +
      '"/>' +
      '<polygon class="rgt" points="' +
      [tp[2], tp[1], r1, l1].map(pt).join(" ") +
      '"/>' +
      '<polygon class="top" points="' +
      tp.map(pt).join(" ") +
      '"/></g>'
    );
  }

  function hexPoints(cx, cy, r) {
    var out = [];
    for (var k = 0; k < 6; k++) {
      var a = (Math.PI / 3) * k;
      out.push(pt([cx + r * Math.cos(a), cy + r * Math.sin(a)]));
    }
    return out.join(" ");
  }

  // ======================================================================
  // U-Net++ graph
  // ======================================================================

  function unetNodes() {
    var out = [];
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4 - i; j++) out.push({ i: i, j: j, id: i + "-" + j });
    }
    return out;
  }

  // What feeds X[i,j]: every earlier map on its own row (the dense skip), one
  // up-sampled map from the row below, and for the encoder column the row
  // above, down-sampled.
  function unetInputs(i, j) {
    var r = [];
    if (j === 0) {
      if (i > 0) r.push({ i: i - 1, j: 0, kind: "down" });
      return r;
    }
    for (var k = 0; k < j; k++) r.push({ i: i, j: k, kind: "skip" });
    r.push({ i: i + 1, j: j - 1, kind: "up" });
    return r;
  }

  function xl(i, j) {
    return "X[" + i + "," + j + "]";
  }

  function unetDescribe(i, j) {
    var ins = unetInputs(i, j);
    if (j === 0) {
      return (
        xl(i, 0) +
        " is an encoder node at " +
        SC[i].trim() +
        " resolution" +
        (i
          ? ": it takes " + xl(i - 1, 0) + ", down-sampled."
          : ": it takes the input image.")
      );
    }
    var same = ins
      .filter(function (x) {
        return x.kind === "skip";
      })
      .map(function (x) {
        return xl(x.i, x.j);
      });
    return (
      xl(i, j) +
      " at " +
      SC[i].trim() +
      " resolution has " +
      ins.length +
      " inputs: " +
      same.join(", ") +
      " from its own row, plus an up-sampled " +
      xl(i + 1, j - 1) +
      "."
    );
  }

  // Hover, focus or click a node: its inputs burn brighter, the rest recede.
  function wireUnet(host, say, idle) {
    var st = { hover: null, pinned: null };
    var nodes = host.querySelectorAll(".dg-node");
    var edges = host.querySelectorAll(".dg-edge");

    function apply() {
      var sel = st.hover || st.pinned;
      var src = {};
      if (sel) {
        var p = sel.split("-").map(Number);
        unetInputs(p[0], p[1]).forEach(function (x) {
          src[x.i + "-" + x.j] = true;
        });
      }
      nodes.forEach(function (n) {
        var id = n.getAttribute("data-id");
        n.classList.toggle("is-sel", id === sel);
        n.classList.toggle("is-src", !!src[id]);
        n.classList.toggle("is-dim", !!sel && id !== sel && !src[id]);
        n.setAttribute("aria-pressed", String(id === st.pinned));
      });
      edges.forEach(function (e) {
        var on = !!sel && e.getAttribute("data-to") === sel;
        e.classList.toggle("is-lit", on);
        e.classList.toggle("is-dim", !!sel && !on);
      });
      if (!sel) say(idle);
      else {
        var q = sel.split("-").map(Number);
        say(unetDescribe(q[0], q[1]));
      }
    }

    host.addEventListener("mouseover", function (e) {
      var n = e.target.closest(".dg-node");
      if (n) {
        st.hover = n.getAttribute("data-id");
        apply();
      }
    });
    host.addEventListener("mouseleave", function () {
      st.hover = null;
      apply();
    });
    host.addEventListener("focusin", function (e) {
      var n = e.target.closest(".dg-node");
      if (n) {
        st.hover = n.getAttribute("data-id");
        apply();
      }
    });
    host.addEventListener("focusout", function () {
      st.hover = null;
      apply();
    });
    host.addEventListener("click", function (e) {
      var n = e.target.closest(".dg-node");
      if (!n) return;
      var id = n.getAttribute("data-id");
      st.pinned = st.pinned === id ? null : id;
      apply();
    });
    host.addEventListener("keydown", function (e) {
      var n = e.target.closest && e.target.closest(".dg-node");
      if (n && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        n.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
    apply();
  }

  function unetView(uid, say) {
    var W = 760;
    var H = 384;
    var R = 19;
    var px = function (j) {
      return 120 + j * 150;
    };
    var py = function (i) {
      return 98 + i * 82;
    };
    var s = svgOpen(
      uid,
      W,
      H,
      "U-Net++ as a wired schematic of its skip pathways",
    );
    var i;

    for (i = 0; i < 4; i++) {
      s +=
        '<text class="dg-lane" x="18" y="' +
        (py(i) + 4) +
        '">' +
        SC[i] +
        "</text>";
    }

    var all = unetNodes();
    all.forEach(function (n) {
      unetInputs(n.i, n.j).forEach(function (f) {
        var x1 = px(f.j),
          y1 = py(f.i),
          x2 = px(n.j),
          y2 = py(n.i),
          d,
          cls;
        if (f.kind === "skip") {
          cls = "skip";
          if (n.j - f.j === 1) {
            d = "M" + (x1 + R) + " " + y1 + " L" + (x2 - R - 4) + " " + y2;
          } else {
            var lift = 24 + (n.j - f.j - 1) * 18;
            d =
              "M" +
              x1 +
              " " +
              (y1 - R) +
              " C" +
              (x1 + 30) +
              " " +
              (y1 - R - lift) +
              " " +
              (x2 - 30) +
              " " +
              (y2 - R - lift) +
              " " +
              x2 +
              " " +
              (y2 - R - 4);
          }
        } else if (f.kind === "up") {
          cls = "up";
          var dx = x2 - x1,
            dy = y2 - y1,
            L = Math.sqrt(dx * dx + dy * dy);
          d =
            "M" +
            (x1 + (dx / L) * R).toFixed(1) +
            " " +
            (y1 + (dy / L) * R).toFixed(1) +
            " L" +
            (x2 - (dx / L) * (R + 4)).toFixed(1) +
            " " +
            (y2 - (dy / L) * (R + 4)).toFixed(1);
        } else {
          cls = "down";
          d = "M" + x1 + " " + (y1 + R) + " L" + x2 + " " + (y2 - R - 4);
        }
        s +=
          '<path class="dg-edge dg-wire ' +
          cls +
          '" data-to="' +
          n.id +
          '" d="' +
          d +
          '"' +
          (cls === "down" ? "" : ' marker-end="url(#' + uid + '-ah)"') +
          "/>";
      });
    });

    all.forEach(function (n) {
      s +=
        '<g class="dg-node ' +
        (n.j === 0 ? "enc" : "nested") +
        '" data-id="' +
        n.id +
        '" tabindex="0" role="button" aria-pressed="false" aria-label="' +
        xl(n.i, n.j) +
        ", " +
        SC[n.i] +
        " resolution, " +
        unetInputs(n.i, n.j).length +
        ' inputs">' +
        '<polygon class="hex" points="' +
        hexPoints(px(n.j), py(n.i), R) +
        '"/>' +
        '<text class="id" x="' +
        px(n.j) +
        '" y="' +
        (py(n.i) + 3.5) +
        '">' +
        n.i +
        "," +
        n.j +
        "</text></g>";
    });
    s +=
      '<text class="dg-label" x="' +
      (px(3) + 40) +
      '" y="' +
      (py(0) + 4) +
      '">lesion mask</text>';
    s +=
      '<text class="dg-label" x="120" y="' +
      (H - 10) +
      '" text-anchor="middle">encoder</text>';
    s +=
      '<text class="dg-label" x="' +
      (px(1) + 40) +
      '" y="' +
      (H - 10) +
      '">nested nodes, each fed by every earlier map on its row</text>';
    s += "</svg>";

    var host = el("div", { class: "dg-svg" });
    host.innerHTML = s;
    var idle = "pick a node, hover it or tab to it, to see what feeds it.";
    wireUnet(host, say, idle);
    return { el: host, controls: null, idle: idle };
  }

  // The same question, answered exactly: the full ancestry of one node.
  function unetDetail(uid, say) {
    var sel = "0-3";
    var body = el("div", { class: "dg-prov" });
    var left = el("pre", { class: "dg-pre" });
    var right = el("div", {});
    body.appendChild(left);
    body.appendChild(right);

    var items = unetNodes().map(function (n) {
      return { key: n.id, text: xl(n.i, n.j), on: n.id === sel };
    });
    var row = controls(items, "Pick a node");

    function ancestry(i, j) {
      var seen = {},
        lines = [],
        longest = 0;
      function walk(i, j, prefix, last, kind, depth) {
        var id = i + "-" + j;
        var branch = depth === 0 ? "" : last ? "└─ " : "├─ ";
        var repeat = !!seen[id];
        lines.push(
          esc(prefix + branch) +
            (kind
              ? '<span class="t-' +
                kind +
                '">' +
                esc("[" + kind + "] ") +
                "</span>"
              : "") +
            '<span class="' +
            (repeat ? "t-seen" : j === 0 ? "t-enc" : "t-id") +
            '">' +
            xl(i, j) +
            "</span>" +
            (j === 0 ? ' <span class="t-enc">encoder</span>' : "") +
            (repeat ? ' <span class="t-seen">(already shown)</span>' : ""),
        );
        if (depth > longest) longest = depth;
        if (repeat) return;
        seen[id] = true;
        var ins = unetInputs(i, j);
        ins.forEach(function (x, n) {
          walk(
            x.i,
            x.j,
            prefix + (depth === 0 ? "" : last ? "   " : "│  "),
            n === ins.length - 1,
            x.kind,
            depth + 1,
          );
        });
      }
      walk(i, j, "", true, null, 0);
      return {
        html: lines.join("\n"),
        count: Object.keys(seen).length - 1,
        depth: longest,
        ids: seen,
      };
    }

    function paint() {
      var p = sel.split("-").map(Number);
      var a = ancestry(p[0], p[1]);
      var direct = {};
      unetInputs(p[0], p[1]).forEach(function (x) {
        direct[x.i + "-" + x.j] = true;
      });
      left.innerHTML = a.html;

      var g = "";
      for (var i = 0; i < 4; i++) {
        var line = ("   " + SC[i]).slice(-4) + "  ";
        for (var j = 0; j < 4 - i; j++) {
          var id = i + "-" + j;
          var cls =
            id === sel
              ? "g-sel"
              : direct[id]
                ? "g-src"
                : a.ids[id]
                  ? "g-anc"
                  : "g-off";
          line +=
            '<span class="' +
            cls +
            '">' +
            (j === 0 ? "●" : "○") +
            "</span>" +
            (j < 3 - i ? '<span class="g-off"> ─ </span>' : "");
        }
        g += line + "\n";
      }
      var reached = unetNodes().filter(function (n) {
        return n.j === 0 && a.ids[n.id];
      }).length;
      right.innerHTML =
        '<pre class="dg-pre">' +
        g +
        "</pre>" +
        '<p class="dg-stat">direct inputs <b>' +
        unetInputs(p[0], p[1]).length +
        "</b><br>total ancestors <b>" +
        a.count +
        "</b><br>longest path <b>" +
        a.depth +
        " hops</b><br>encoder levels reached <b>" +
        reached +
        " of 4</b></p>";
      say(unetDescribe(p[0], p[1]));
      setPressed(row, sel);
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".d-btn");
      if (b) {
        sel = b.getAttribute("data-key");
        paint();
      }
    });
    paint();
    return { el: body, controls: row, idle: "" };
  }

  // ======================================================================
  // nnU-Net ensemble
  // ======================================================================

  function foldSay(sel) {
    if (sel === null)
      return "each fold sees a different four fifths of the data.";
    var trains = [0, 1, 2, 3, 4]
      .filter(function (b) {
        return b !== sel;
      })
      .join(" ");
    return (
      "fold " +
      sel +
      ": trains on blocks " +
      trains +
      ", validates on " +
      sel +
      "."
    );
  }

  function ensembleView(uid, say) {
    var W = 760,
      H = 336,
      MX = 500,
      MY = 168;
    var rowY = function (i) {
      return 56 + i * 56;
    };
    var s = svgOpen(
      uid,
      W,
      H,
      "The five nnU-Net folds, each trained with a different block held out, averaged into one map",
    );
    s += '<text class="dg-label" x="80" y="20">held-out block</text>';
    s += '<text class="dg-label" x="300" y="20">model</text>';
    s +=
      '<text class="dg-label" x="' +
      MX +
      '" y="20" text-anchor="middle">average</text>';
    s +=
      '<text class="dg-label" x="660" y="20" text-anchor="middle">ensemble</text>';

    for (var i = 0; i < 5; i++) {
      var y = rowY(i);
      s += '<g class="dg-fold" data-fold="' + i + '">';
      s +=
        '<text class="dg-lane" x="18" y="' +
        (y + 4) +
        '">fold ' +
        i +
        "</text>";
      for (var j = 0; j < 5; j++) {
        s +=
          '<rect class="dg-cell' +
          (i === j ? " held" : "") +
          '" x="' +
          (80 + j * 30) +
          '" y="' +
          (y - 9) +
          '" width="26" height="18"/>';
      }
      s +=
        '<path class="dg-edge dg-wire" d="M236 ' +
        y +
        " L296 " +
        y +
        '" marker-end="url(#' +
        uid +
        '-ah)"/>';
      s +=
        '<polygon class="dg-model" points="300,' +
        y +
        " 308," +
        (y - 13) +
        " 362," +
        (y - 13) +
        " 370," +
        y +
        " 362," +
        (y + 13) +
        " 308," +
        (y + 13) +
        '"/>';
      s += '<text class="dg-id" x="335" y="' + (y + 3.5) + '">nnU-Net</text>';
      s +=
        '<path class="dg-edge dg-wire" d="M374 ' +
        y +
        " C430 " +
        y +
        " 440 " +
        MY +
        " " +
        (MX - 32) +
        " " +
        MY +
        '" marker-end="url(#' +
        uid +
        '-ah)"/>';
      s += "</g>";
    }
    s += '<polygon class="dg-hexn" points="' + hexPoints(MX, MY, 28) + '"/>';
    s +=
      '<text class="dg-id" x="' + MX + '" y="' + (MY + 3.5) + '">mean</text>';
    s +=
      '<path class="dg-wire dg-out" d="M532 ' +
      MY +
      " L598 " +
      MY +
      '" marker-end="url(#' +
      uid +
      '-ah)"/>';
    s +=
      '<rect class="dg-frame" x="604" y="' +
      (MY - 46) +
      '" width="112" height="92"/>';
    s += '<ellipse class="dg-organ" cx="660" cy="' + MY + '" rx="40" ry="28"/>';
    s +=
      '<ellipse class="dg-blob-lo" cx="646" cy="' +
      (MY + 6) +
      '" rx="19" ry="14"/>';
    s +=
      '<ellipse class="dg-blob" cx="646" cy="' +
      (MY + 6) +
      '" rx="10" ry="8"/>';
    s +=
      '<text class="dg-label" x="660" y="' +
      (MY + 68) +
      '" text-anchor="middle">csPCa likelihood</text>';
    s += "</svg>";

    var host = el("div", { class: "dg-svg" });
    host.innerHTML = s;
    var folds = host.querySelectorAll(".dg-fold");

    var st = { hover: null, pinned: null };
    var row = controls(
      [{ key: "all", text: "all folds", on: true }].concat(
        [0, 1, 2, 3, 4].map(function (k) {
          return { key: String(k), text: "fold " + k };
        }),
      ),
      "Isolate a fold",
    );

    function apply() {
      var sel = st.hover !== null ? st.hover : st.pinned;
      folds.forEach(function (g) {
        var on = sel === null || g.getAttribute("data-fold") === String(sel);
        g.classList.toggle("is-dim", !on);
        g.classList.toggle("is-sel", sel !== null && on);
      });
      setPressed(row, st.pinned === null ? "all" : String(st.pinned));
      say(foldSay(sel === null ? null : Number(sel)));
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".d-btn");
      if (!b) return;
      var k = b.getAttribute("data-key");
      st.pinned = k === "all" ? null : Number(k);
      apply();
    });
    folds.forEach(function (g) {
      g.addEventListener("mouseenter", function () {
        st.hover = Number(g.getAttribute("data-fold"));
        apply();
      });
    });
    host.addEventListener("mouseleave", function () {
      st.hover = null;
      apply();
    });
    apply();
    return { el: host, controls: row, idle: "" };
  }

  function ensembleDetail(uid, say) {
    var sel = null;
    var pre = el("pre", { class: "dg-pre dg-table" });
    var row = controls(
      [{ key: "all", text: "all folds", on: true }].concat(
        [0, 1, 2, 3, 4].map(function (k) {
          return { key: String(k), text: "fold " + k };
        }),
      ),
      "Highlight a fold",
    );

    function paint() {
      var out =
        '<span class="t-id">fold   trains on blocks   validates on</span>\n';
      for (var i = 0; i < 5; i++) {
        var on = sel === null || sel === i;
        var blocks = [0, 1, 2, 3, 4]
          .filter(function (b) {
            return b !== i;
          })
          .join(" ");
        out +=
          '<span class="' +
          (on ? "t-enc" : "t-seen") +
          '">' +
          (" " + i + "    ").slice(0, 6) +
          '</span><span class="' +
          (on ? "t-id" : "t-seen") +
          '">' +
          (blocks + "            ").slice(0, 19) +
          '</span><span class="' +
          (on ? "t-skip" : "t-seen") +
          '">' +
          i +
          "</span>\n";
      }
      out +=
        '\n<span class="t-seen">the mean of the five cancels some of each fold\'s blind spot</span>';
      pre.innerHTML = out;
      setPressed(row, sel === null ? "all" : String(sel));
      say(foldSay(sel));
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".d-btn");
      if (!b) return;
      var k = b.getAttribute("data-key");
      sel = k === "all" ? null : Number(k);
      paint();
    });
    paint();
    return { el: pre, controls: row, idle: "" };
  }

  // ======================================================================
  // SwinUNETR
  // ======================================================================

  var SWIN_REG = [
    [0, 0, 4, 4],
    [4, 0, 4, 4],
    [0, 4, 4, 4],
    [4, 4, 4, 4],
  ];
  var SWIN_SHIFT = [
    [0, 0, 2, 2],
    [2, 0, 4, 2],
    [6, 0, 2, 2],
    [0, 2, 2, 4],
    [2, 2, 4, 4],
    [6, 2, 2, 4],
    [0, 6, 2, 2],
    [2, 6, 4, 2],
    [6, 6, 2, 2],
  ];

  function swinSay(mode) {
    if (mode === "l1") {
      return "grid shifted by half a window. the marked patch now shares a window with neighbours it could not see before.";
    }
    if (mode === "both") {
      return "across both layers the marked patch can draw on 28 distinct patches, where one layer alone gives it 16.";
    }
    return "regular grid. the marked patch can only attend to the cells boxed with it.";
  }

  function swinView(uid, say) {
    var W = 760,
      H = 372;
    var s = svgOpen(
      uid,
      W,
      H,
      "SwinUNETR: a strip of feature-map slabs above a window grid etched on one slab",
    );

    // the U, as slabs: footprint shrinks and thickness grows down the encoder
    var half = function (k) {
      return 26 * Math.pow(0.78, k);
    };
    var thick = function (k) {
      return 8 + k * 8;
    };
    var CY = 96;
    var k;
    s +=
      '<text class="dg-label" x="40" y="22">encoder: shifted-window attention</text>';
    s += '<text class="dg-label" x="420" y="22">decoder: convolution</text>';
    var names = ["H×W", "½", "¼", "⅛"];
    for (k = 0; k < 4; k++) {
      var ex = 80 + k * 78;
      s += slab(ex, CY, half(k), thick(k), "enc");
      s +=
        '<text class="dg-small" x="' +
        ex +
        '" y="' +
        (CY + 46) +
        '" text-anchor="middle">Swin ' +
        (k + 1) +
        "</text>";
      s +=
        '<text class="dg-small dg-faint" x="' +
        ex +
        '" y="' +
        (CY + 59) +
        '" text-anchor="middle">' +
        names[k] +
        "</text>";
      var dk = 3 - k;
      var dx = 420 + dk * 78;
      s += slab(dx, CY, half(k), thick(k), "dec");
      s +=
        '<text class="dg-small" x="' +
        dx +
        '" y="' +
        (CY + 46) +
        '" text-anchor="middle">conv ' +
        (k + 1) +
        "</text>";
      // skip connection, over the top of the whole strip
      var topY = 40 - k * 5;
      s +=
        '<path class="dg-skip" d="M' +
        ex +
        " " +
        (CY - thick(k) - half(k) * 0.55 - 2) +
        " C" +
        ex +
        " " +
        topY +
        " " +
        dx +
        " " +
        topY +
        " " +
        dx +
        " " +
        (CY - thick(k) - half(k) * 0.55 - 2) +
        '"/>';
    }

    // the window demo: one slab, its top face etched with an 8x8 patch grid
    var cx = 380,
      cy = 268,
      c = 17,
      t = 14;
    var P = function (u, v) {
      return iso(cx, cy, (u - 4) * c, (v - 4) * c, t);
    };
    s += '<text class="dg-label" x="40" y="186">window partition</text>';
    s += slab(cx, cy, 4 * c, t, "demo");
    var n;
    for (n = 0; n <= 8; n++) {
      s +=
        '<path class="dg-grid" d="M' + pt(P(n, 0)) + " L" + pt(P(n, 8)) + '"/>';
      s +=
        '<path class="dg-grid" d="M' + pt(P(0, n)) + " L" + pt(P(8, n)) + '"/>';
    }
    var quad = function (r) {
      return [
        P(r[0], r[1]),
        P(r[0] + r[2], r[1]),
        P(r[0] + r[2], r[1] + r[3]),
        P(r[0], r[1] + r[3]),
      ]
        .map(pt)
        .join(" ");
    };
    s += '<g class="dg-wins dg-w-reg">';
    SWIN_REG.forEach(function (r) {
      s += '<polygon class="dg-win" points="' + quad(r) + '"/>';
    });
    s += '<polygon class="dg-home" points="' + quad([0, 0, 4, 4]) + '"/></g>';
    s += '<g class="dg-wins dg-w-shift is-off">';
    SWIN_SHIFT.forEach(function (r) {
      s += '<polygon class="dg-win" points="' + quad(r) + '"/>';
    });
    s += '<polygon class="dg-home" points="' + quad([2, 2, 4, 4]) + '"/></g>';
    s += '<polygon class="dg-mark" points="' + quad([3, 3, 1, 1]) + '"/>';
    s +=
      '<text class="dg-small" x="' +
      (cx + 150) +
      '" y="' +
      (cy + 4) +
      '">marked patch</text>';
    s +=
      '<path class="dg-leader" d="M' +
      (cx + 146) +
      " " +
      (cy + 1) +
      " L" +
      pt(P(3.5, 3.5)).replace(",", " ") +
      '"/>';
    s += "</svg>";

    var host = el("div", { class: "dg-svg" });
    host.innerHTML = s;
    var reg = host.querySelector(".dg-w-reg");
    var shi = host.querySelector(".dg-w-shift");
    var row = controls(
      [
        { key: "l", text: "layer ℓ", on: true },
        { key: "l1", text: "layer ℓ+1" },
      ],
      "Shift the window grid",
    );
    function apply(mode) {
      reg.classList.toggle("is-off", mode === "l1");
      shi.classList.toggle("is-off", mode !== "l1");
      setPressed(row, mode);
      say(swinSay(mode));
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".d-btn");
      if (b) apply(b.getAttribute("data-key"));
    });
    apply("l");
    return { el: host, controls: row, idle: "" };
  }

  function swinDetail(uid, say) {
    var mode = "l";
    var pre = el("pre", { class: "dg-pre dg-table" });
    var row = controls(
      [
        { key: "l", text: "layer ℓ", on: true },
        { key: "l1", text: "layer ℓ+1" },
        { key: "both", text: "both layers" },
      ],
      "Which layer's windows to show",
    );
    function inReg(u, v) {
      return u < 4 && v < 4;
    }
    function inShift(u, v) {
      return u >= 2 && u <= 5 && v >= 2 && v <= 5;
    }
    function paint() {
      var showR = mode === "l" || mode === "both";
      var showS = mode === "l1" || mode === "both";
      var count = 0;
      var out = "";
      for (var v = 0; v < 8; v++) {
        var line = "  ";
        for (var u = 0; u < 8; u++) {
          var r = showR && inReg(u, v);
          var h = showS && inShift(u, v);
          var ch, cls;
          if (u === 3 && v === 3) {
            ch = "◆";
            cls = "g-sel";
            count++;
          } else if (r && h) {
            ch = "●";
            cls = "g-src";
            count++;
          } else if (r || h) {
            ch = "○";
            cls = "g-anc";
            count++;
          } else {
            ch = "·";
            cls = "g-off";
          }
          line += '<span class="' + cls + '">' + ch + "</span> ";
        }
        out += line + "\n";
      }
      out +=
        '\n<span class="t-id">  patches the marked one can attend to: ' +
        count +
        "</span>\n";
      out +=
        '<span class="t-seen">  ◆ marked patch   ● in both windows   ○ in one window</span>';
      pre.innerHTML = out;
      setPressed(row, mode);
      say(swinSay(mode));
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".d-btn");
      if (b) {
        mode = b.getAttribute("data-key");
        paint();
      }
    });
    paint();
    return { el: pre, controls: row, idle: "" };
  }

  // ======================================================================
  // The tabs
  // ======================================================================

  var DIAGRAMS = {
    cspca: {
      label: "Model architectures",
      note: "Three architectures. The nnU-Net tab covers both its five folds and the ensemble of them. Structure only; the measured scores are in the dashboard.",
      tabs: [
        {
          id: "ensemble",
          name: "nnU-Net ensemble",
          desc: "Five nnU-Net models, each trained with a different fifth of the data held out, whose probability maps are averaged into one prediction.",
          diagram: ensembleView,
          detail: ensembleDetail,
        },
        {
          id: "swin",
          name: "SwinUNETR",
          desc: "A transformer encoder of shifted-window attention blocks feeding a convolutional decoder. Attention stays inside each window, and shifting the grid every other layer lets information cross window boundaries.",
          diagram: swinView,
          detail: swinDetail,
        },
        {
          id: "unetpp",
          name: "U-Net++",
          desc: "A U-Net whose skip connections are replaced by a dense triangular grid of nested nodes, each fed by every earlier map on its row plus an up-sampled map from the row below.",
          diagram: unetView,
          detail: unetDetail,
        },
      ],
    },
  };

  function renderDiagram(name) {
    var spec = DIAGRAMS[name];
    if (!spec) return null;

    var uid = "dg" + ++diagramUid;
    var tablist = el("div", {
      class: "diagram-tabs",
      role: "tablist",
      "aria-label": spec.label,
    });
    var panels = [];
    var buttons = [];

    spec.tabs.forEach(function (tab, index) {
      var first = index === 0;
      var tabId = uid + "-tab-" + tab.id;
      var panelId = uid + "-panel-" + tab.id;

      var btn = el("button", {
        type: "button",
        class: "diagram-tab d-" + tab.id,
        id: tabId,
        role: "tab",
        "aria-controls": panelId,
        "aria-selected": String(first),
        tabindex: first ? "0" : "-1",
        text: tab.name,
      });
      tablist.appendChild(btn);
      buttons.push(btn);

      var views = controls(
        [
          { key: "diagram", text: "diagram", on: true },
          { key: "detail", text: "detail" },
        ],
        tab.name + " view",
      );
      views.classList.add("d-views");

      var stage = el("div", { class: "diagram-scroll" });
      var holder = el("div", { class: "d-holder" });
      var readout = el("p", {
        class: "diagram-readout",
        role: "status",
        "aria-live": "polite",
      });
      function say(text) {
        readout.textContent = text;
      }

      var current = "diagram";
      function show(view) {
        current = view;
        stage.innerHTML = "";
        holder.innerHTML = "";
        var v = tab[view](uid + "-" + tab.id + "-" + view, say);
        stage.appendChild(v.el);
        if (v.controls) holder.appendChild(v.controls);
        if (v.idle) say(v.idle);
        setPressed(views, view);
      }
      views.addEventListener("click", function (e) {
        var b = e.target.closest(".d-btn");
        if (b && b.getAttribute("data-key") !== current)
          show(b.getAttribute("data-key"));
      });

      var panel = el(
        "div",
        {
          class: "diagram-panel d-" + tab.id,
          id: panelId,
          role: "tabpanel",
          "aria-labelledby": tabId,
        },
        [
          el("p", { class: "sr-only", text: tab.desc }),
          views,
          stage,
          holder,
          readout,
        ],
      );
      show("diagram");

      panel.hidden = !first;
      panels.push(panel);
    });

    function select(index) {
      buttons.forEach(function (b, i) {
        b.setAttribute("aria-selected", String(i === index));
        b.setAttribute("tabindex", i === index ? "0" : "-1");
        panels[i].hidden = i !== index;
      });
    }

    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () {
        select(i);
      });
      b.addEventListener("keydown", function (e) {
        var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (e.key === "Home") step = -i;
        if (e.key === "End") step = buttons.length - 1 - i;
        if (!step) return;
        e.preventDefault();
        var next = (i + step + buttons.length) % buttons.length;
        select(next);
        buttons[next].focus();
      });
    });

    return el(
      "div",
      { class: "diagram" },
      [tablist].concat(panels, [
        spec.note ? el("p", { class: "diagram-note", text: spec.note }) : null,
      ]),
    );
  }

  // ---- Power lines ---------------------------------------------------------
  // Two layers of utility poles and sagging cable: a distant row, small and
  // faint, behind a near row that is tall and heavy. Irregular spacing and
  // height throughout, because evenly spaced poles read as a fence.

  function wireLayer(cfg) {
    var W = 1200;
    var poles = [];
    var x = cfg.start;
    while (x < W + 80) {
      poles.push({
        x: x,
        top: cfg.top + ((Math.sin(x * cfg.freq) + 1) / 2) * cfg.range,
        arms: Math.round(x) % 3 === 0 ? cfg.arms + 1 : cfg.arms,
      });
      x += cfg.gap + Math.round(Math.sin(x * 0.07) * cfg.jitter);
    }

    var g = "";
    var i, k;
    for (i = 0; i < poles.length - 1; i++) {
      var a = poles[i];
      var b = poles[i + 1];
      for (k = 0; k < Math.min(a.arms, b.arms); k++) {
        var ya = a.top + cfg.arm0 + k * cfg.armStep;
        var yb = b.top + cfg.arm0 + k * cfg.armStep;
        g +=
          '<path d="M' +
          a.x +
          " " +
          ya +
          " Q" +
          (a.x + b.x) / 2 +
          " " +
          (Math.max(ya, yb) + cfg.sag + k * cfg.sag * 0.3) +
          " " +
          b.x +
          " " +
          yb +
          '" fill="none" stroke="var(--line)" stroke-width="' +
          cfg.wire +
          '" opacity="0.7"/>';
      }
    }
    poles.forEach(function (pl) {
      g +=
        '<path d="M' +
        pl.x +
        " " +
        cfg.base +
        " V" +
        pl.top +
        '" stroke="var(--line)" stroke-width="' +
        cfg.pole +
        '"/>';
      for (var j = 0; j < pl.arms; j++) {
        var y = pl.top + cfg.arm0 + j * cfg.armStep;
        var w = cfg.armW - j * 2;
        g +=
          '<path d="M' +
          (pl.x - w) +
          " " +
          y +
          " H" +
          (pl.x + w) +
          '" stroke="var(--line)" stroke-width="' +
          cfg.arm +
          '"/>';
        g +=
          '<path d="M' +
          (pl.x - w) +
          " " +
          (y - 4) +
          " V" +
          y +
          "M" +
          (pl.x + w) +
          " " +
          (y - 4) +
          " V" +
          y +
          '" stroke="var(--line)" stroke-width="1.3"/>';
      }
    });
    return '<g opacity="' + cfg.opacity + '">' + g + "</g>";
  }

  function initWires() {
    var host = byId("wire-band");
    if (!host) return;

    var W = 1200;
    var H = 270;

    var far = wireLayer({
      start: -20,
      gap: 118,
      jitter: 30,
      top: 118,
      range: 26,
      freq: 0.033,
      arms: 2,
      arm0: 6,
      armStep: 9,
      armW: 10,
      sag: 9,
      wire: 0.9,
      pole: 1.6,
      arm: 1.2,
      base: H,
      opacity: 0.5,
    });
    var near = wireLayer({
      start: -40,
      gap: 150,
      jitter: 52,
      top: 22,
      range: 78,
      freq: 0.021,
      arms: 2,
      arm0: 10,
      armStep: 15,
      armW: 20,
      sag: 22,
      wire: 1.2,
      pole: 3,
      arm: 2.1,
      base: H,
      opacity: 1,
    });

    host.innerHTML =
      '<svg viewBox="0 0 ' +
      W +
      " " +
      H +
      '" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
      far +
      near +
      "</svg>";
  }

  // ---- The hero field -------------------------------------------------------
  // A field of characters behind the masthead: several sine waves interfere,
  // and the result is drawn as data. Quiet cells are dots, busier ones are
  // punctuation, and the crests resolve into hex digits and solid blocks. The
  // glyph at a given cell never changes, only how bright it is, so the field
  // moves without any flicker. It fades out toward the name and toward the
  // power lines, so it reads as the sky above them rather than a box.

  var HEXCH = "0123456789ABCDEF";
  var LEVELS = [" ", "·", ":", "+", "#", "#", "#"];
  var LEVEL_CLASS = [
    "",
    "a-grid",
    "a-lo",
    "a-mid",
    "a-glow",
    "a-hi",
    "a-crest",
  ];

  function cellHash(x, y) {
    return ((x * 374761393 + y * 668265263) >>> 13) & 15;
  }
  function smooth(a, b, v) {
    var t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function fieldFrame(cols, rows, t) {
    var out = [];
    var cx = cols * 0.72;
    var cy = rows * 0.45;
    for (var y = 0; y < rows; y++) {
      var line = "";
      var cur = null;
      var buf = "";
      // a soft fade at the top and, more strongly, at the bottom
      var ey = Math.min(
        smooth(0, 0.12, y / rows),
        1 - smooth(0.62, 1, y / rows),
      );
      for (var x = 0; x < cols; x++) {
        var ex = Math.min(
          smooth(0.04, 0.5, x / cols),
          1 - smooth(0.9, 1, x / cols),
        );
        var v =
          Math.sin(x * 0.075 + t) +
          Math.sin(y * 0.24 - t * 0.8) +
          Math.sin(x * 0.04 + y * 0.17 + t * 0.55) +
          Math.sin(
            Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) * 5) * 0.2 -
              t * 1.1,
          );
        v = ((v / 4 + 1) / 2) * ex * ey;
        var lvl = Math.min(6, Math.floor(v * 7.6));
        var ch = LEVELS[lvl];
        if (lvl >= 4) ch = HEXCH.charAt(cellHash(x, y));
        else if (lvl === 3) ch = cellHash(x, y) & 1 ? "+" : "=";
        var cls = LEVEL_CLASS[lvl];
        if (cls !== cur) {
          if (buf)
            line += cur ? '<span class="' + cur + '">' + buf + "</span>" : buf;
          buf = "";
          cur = cls;
        }
        buf += ch;
      }
      if (buf)
        line += cur ? '<span class="' + cur + '">' + buf + "</span>" : buf;
      out.push(line);
    }
    return out.join("\n");
  }

  function initHeroArt() {
    var host = byId("hero-art");
    if (!host) return;

    var cols = 0;
    var rows = 0;
    var t = 2.4;
    var timer = null;

    // Size the grid to the box it sits in, from the actual glyph size.
    function measure() {
      var probe = el("span", { text: "MMMMMMMMMM" });
      probe.style.cssText =
        "position:absolute;visibility:hidden;white-space:pre";
      host.appendChild(probe);
      var cw = probe.getBoundingClientRect().width / 10 || 8;
      host.removeChild(probe);
      var lh = parseFloat(getComputedStyle(host).lineHeight) || 15;
      var box = host.getBoundingClientRect();
      cols = Math.max(20, Math.floor(box.width / cw));
      rows = Math.max(8, Math.floor(box.height / lh));
    }
    function draw() {
      host.innerHTML = fieldFrame(cols, rows, t);
    }
    function tick() {
      t += 0.06;
      draw();
    }
    function start() {
      if (!timer) timer = window.setInterval(tick, 80);
    }
    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    measure();
    draw();
    var wait = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(wait);
      wait = window.setTimeout(function () {
        measure();
        draw();
      }, 150);
    });
    if (reducedMotion()) return;

    // No point animating it while it is scrolled off the screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }).observe(host);
    } else {
      start();
    }
  }

  // ---- The side rails -------------------------------------------------------
  // A level metre down each margin: rows of bars reaching in from the outer
  // edge, like a spectrum seen sideways. It drifts very slowly on its own
  // clock, so it sits in peripheral vision instead of reacting to the reader.
  // It exists only where the margins are wide enough to hold it, and fades
  // toward the content so it never competes with the text.

  function meterFrame(cols, rows, phase, seed, side) {
    var chars = [];
    var cls = [];
    var x, y, k;
    for (y = 0; y < rows; y++) {
      chars.push(new Array(cols).fill(" "));
      cls.push(new Array(cols).fill(""));
    }
    function put(px, py, ch, c) {
      if (px < 0 || px >= cols) return;
      chars[py][px] = ch;
      cls[py][px] = c;
    }
    for (y = 0; y < rows; y++) {
      // two slow sines multiplied, so neighbouring bars differ but the whole
      // column breathes together
      var v = Math.max(
        0,
        Math.min(
          1,
          0.5 +
            0.3 * Math.sin(y * 0.45 + phase * 3 + seed) +
            0.22 * Math.sin(y * 1.1 - phase * 2 + seed * 2) +
            0.16 * Math.sin(y * 2.3 + phase * 4 + seed * 3) +
            0.12 * Math.sin(y * 0.17 - phase + seed),
        ),
      );
      // sharpen, so peaks stand clear of the troughs
      v = v * v * (3 - 2 * v);
      var len = Math.round(cols * (0.04 + 0.46 * v));
      // the quietest rows are left empty, so the column has gaps in it
      if (v < 0.12) len = 0;
      for (k = 0; k < len; k++) {
        x = side === "left" ? k : cols - 1 - k;
        var head = k === len - 1;
        put(
          x,
          y,
          head ? HEXCH.charAt(cellHash(y, len)) : "=",
          head ? "a-hi" : k > len - 4 ? "a-glow" : "a-lo",
        );
      }
      // a faint dot just past the end of each bar
      var gx = side === "left" ? len + 1 : cols - 2 - len;
      if (len + 2 < cols) put(gx, y, "·", "a-grid");
    }

    var out = [];
    for (y = 0; y < rows; y++) {
      var line = "";
      var cur = null;
      var buf = "";
      for (x = 0; x < cols; x++) {
        var c = cls[y][x];
        if (c !== cur) {
          if (buf)
            line += cur ? '<span class="' + cur + '">' + buf + "</span>" : buf;
          buf = "";
          cur = c;
        }
        buf += chars[y][x];
      }
      if (buf)
        line += cur ? '<span class="' + cur + '">' + buf + "</span>" : buf;
      out.push(line);
    }
    return out.join("\n");
  }

  function initEdgeArt() {
    if (S.edgeArt === false) return;
    var rails = ["left", "right"].map(function (side, i) {
      var pre = el("pre", {
        class: "edge-art edge-" + side,
        "aria-hidden": "true",
      });
      doc.body.appendChild(pre);
      return { host: pre, side: side, seed: i * 2.1 };
    });

    var cols = 0;
    var rows = 0;
    var began = window.performance.now();
    var timer = null;

    function measure() {
      var host = rails[0].host;
      var box = host.getBoundingClientRect();
      if (box.width < 40) {
        cols = 0;
        return;
      }
      var probe = el("span", { text: "MMMMMMMMMM" });
      probe.style.cssText =
        "position:absolute;visibility:hidden;white-space:pre";
      host.appendChild(probe);
      var cw = probe.getBoundingClientRect().width / 10 || 8;
      host.removeChild(probe);
      var lh = parseFloat(getComputedStyle(host).lineHeight) || 15;
      cols = Math.max(6, Math.floor(box.width / cw));
      rows = Math.max(10, Math.ceil(box.height / lh));
    }
    function draw() {
      if (!cols) return;
      // 0.06 phase units a second: slow enough that nothing visibly moves
      // while you read, but the bars are never quite where you left them
      var phase = 1.2 + ((window.performance.now() - began) / 1000) * 0.06;
      rails.forEach(function (r) {
        r.host.innerHTML = meterFrame(cols, rows, phase, r.seed, r.side);
      });
    }

    measure();
    draw();

    // The rails sit in the margins of the whole page, but the power lines run
    // the full width at the top. The rails are clipped to start just below the lines, so they don't compete with them.
    //  The clip is updated on scroll and resize, but only once per frame.

    var band = byId("wire-band");
    var cropQueued = false;
    function crop() {
      cropQueued = false;
      if (!band) return;
      var top = rails[0].host.getBoundingClientRect().top;
      var clip = Math.max(0, band.getBoundingClientRect().bottom - 24 - top);
      rails.forEach(function (r) {
        r.host.style.setProperty("--rail-clip", Math.round(clip) + "px");
      });
    }
    function queueCrop() {
      if (cropQueued) return;
      cropQueued = true;
      window.requestAnimationFrame(crop);
    }
    crop();
    window.addEventListener("scroll", queueCrop, { passive: true });
    window.addEventListener("resize", queueCrop);
    var wait = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(wait);
      wait = window.setTimeout(function () {
        measure();
        draw();
      }, 150);
    });
    if (reducedMotion()) return;

    // four redraws a second is plenty at this speed, and none while the tab
    // is in the background
    timer = window.setInterval(function () {
      if (!doc.hidden) draw();
    }, 250);
  }

  // ---- Screenshot gallery with a lightbox ----------------------------------

  var lightbox = null;

  function openLightbox(src, alt, caption) {
    if (!lightbox) {
      var img = el("img", { class: "lightbox-img", src: "", alt: "" });
      var cap = el("p", { class: "lightbox-caption" });
      var close = el("button", {
        type: "button",
        class: "lightbox-close",
        "aria-label": "Close image",
        text: "×",
      });
      lightbox = el("dialog", { class: "lightbox" }, [close, img, cap]);
      lightbox.img = img;
      lightbox.cap = cap;
      close.addEventListener("click", function () {
        lightbox.close();
      });
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) lightbox.close();
      });
      doc.body.appendChild(lightbox);
    }

    lightbox.img.setAttribute("src", src);
    lightbox.img.setAttribute("alt", alt || "");
    lightbox.cap.textContent = caption || "";
    if (typeof lightbox.showModal === "function") lightbox.showModal();
    else window.open(src, "_blank", "noopener");
  }

  function gallery(items) {
    var figures = items
      .filter(function (g) {
        return g && g.src;
      })
      .map(function (g) {
        var btn = el(
          "button",
          {
            type: "button",
            class: "shot",
            "aria-label": "Enlarge: " + (g.caption || g.alt || "screenshot"),
          },
          [
            el("img", { src: g.src, alt: g.alt || "", loading: "lazy" }),
            g.caption
              ? el("span", { class: "shot-caption", text: g.caption })
              : null,
          ],
        );
        btn.addEventListener("click", function () {
          openLightbox(g.src, g.alt, g.caption);
        });
        return btn;
      });

    if (!figures.length) return null;
    return el(
      "div",
      { class: "gallery", role: "group", "aria-label": "More screenshots" },
      figures,
    );
  }

  // ---- Theme and page meta -------------------------------------------------

  function applyTheme() {
    var t = S.theme || {};
    // The palette lives in CSS.
    // Section 1 of styles.css lists the available names.
    if (t.palette) root.setAttribute("data-palette", t.palette);
    if (t.fontDisplay) root.style.setProperty("--font-display", t.fontDisplay);
    if (t.accent) root.style.setProperty("--accent", t.accent);
    if (t.fontBody) root.style.setProperty("--font-body", t.fontBody);
    if (t.fontHeading) root.style.setProperty("--font-heading", t.fontHeading);
    if (t.fontUrl)
      doc.head.appendChild(el("link", { rel: "stylesheet", href: t.fontUrl }));
  }

  function applyMeta() {
    if (S.title) doc.title = S.title;
    var meta = doc.querySelector('meta[name="description"]');
    if (meta && S.description) meta.setAttribute("content", S.description);
  }

  // ---- Sections ------------------------------------------------------------

  // One span per character, so the name can stagger in and the surname can
  // take the accent colour. `animate` is false for the header wordmark,
  // which should just be there.
  function twoTone(name, animate) {
    var text = String(name || "");
    var cut = text.lastIndexOf(" ");
    return text.split("").map(function (ch, i) {
      var cls = "ch";
      if (ch === " ") cls += " ch-space";
      if (cut > 0 && i > cut) cls += " accent-word";
      if (animate) cls += " ch-in";
      return el("span", {
        class: cls,
        "aria-hidden": "true",
        style: animate ? "--c:" + i : null,
        text: ch === " " ? "\u00a0" : ch,
      });
    });
  }

  function renderHero() {
    setText("hero-role", S.role);
    mount("hero-name", twoTone(S.name, true));
    var nameEl = byId("hero-name");
    if (nameEl) nameEl.setAttribute("aria-label", S.name);
    setText("hero-tagline", S.tagline);

    var actions = [];
    if (has(S.projects))
      actions.push(link("See my work", "#projects", "btn btn-primary"));
    if (S.contact && S.contact.email) {
      actions.push(link("Say hello", "mailto:" + S.contact.email, "btn"));
    }
    mount("hero-actions", actions);

    var photoHost = byId("hero-photo");
    if (!photoHost) return;
    if (S.photo) {
      mount("hero-photo", [
        el("img", {
          src: S.photo,
          alt: S.photoAlt || "",
          width: 160,
          height: 160,
        }),
      ]);
    } else {
      photoHost.hidden = true;
    }
  }

  function renderAbout() {
    var a = S.about || {};
    if (!has(a.paragraphs) && !has(S.interests)) return hideSection("about");

    mount(
      "about-text",
      (a.paragraphs || []).map(function (p) {
        return el("p", { text: p });
      }),
    );
    renderInterests();
  }

  // Load interests as a list of chips, or hide the section if there are none.
  function renderInterests() {
    var host = byId("interests");
    if (!host) return;
    if (!has(S.interests)) {
      host.hidden = true;
      return;
    }
    mount("interests", [
      el("h3", { text: S.interestsTitle || "Outside of code" }),
      el("ul", { class: "chips" }, S.interests.map(chip)),
    ]);
  }

  // The window frame reads better with something in its title bar. Prefer
  // the repo name as it is easier for the viewer to find on my github.
  function windowLabel(p) {
    var src = (p.links || []).filter(function (l) {
      return l && l.url && /github\.com/.test(l.url);
    })[0];
    if (src) {
      var parts = src.url.replace(/\/+$/, "").split("/");
      return parts[parts.length - 2] + "/" + parts[parts.length - 1];
    }
    return p.title;
  }

  // One large screenshot in a window frame, with the project's other
  // screenshots as a strip underneath. Falls back to a single framed image.
  // The architecture diagram and the database schema are drawn here, in the
  // site's own language, instead of being shipped as pictures. Each one is a
  // small spec: build() returns the SVG and describe() the readout for a node.
  // A gallery slide names one with `graph: "name"`.

  function roundedPath(pts, r) {
    var d = "M" + pts[0][0] + " " + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i],
        a = pts[i - 1],
        b = pts[i + 1];
      var d1 = Math.hypot(p[0] - a[0], p[1] - a[1]);
      var d2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
      var r1 = Math.min(r, d1 / 2),
        r2 = Math.min(r, d2 / 2);
      d +=
        " L" +
        (p[0] + ((a[0] - p[0]) / d1) * r1) +
        " " +
        (p[1] + ((a[1] - p[1]) / d1) * r1);
      d +=
        " Q" +
        p[0] +
        " " +
        p[1] +
        " " +
        (p[0] + ((b[0] - p[0]) / d2) * r2) +
        " " +
        (p[1] + ((b[1] - p[1]) / d2) * r2);
    }
    var l = pts[pts.length - 1];
    return d + " L" + l[0] + " " + l[1];
  }

  // Crow's foot and bar, drawn at the end of a relationship line.
  // (x,y) sits on the table edge; (ox,oy) is the unit vector pointing away
  // from the table along the line.
  function endGlyph(x, y, ox, oy, many) {
    var px = -oy,
      py = ox;
    if (many) {
      var ax = x + ox * 13,
        ay = y + oy * 13;
      return (
        "M" +
        ax +
        " " +
        ay +
        " L" +
        (x + px * 7) +
        " " +
        (y + py * 7) +
        " M" +
        ax +
        " " +
        ay +
        " L" +
        (x - px * 7) +
        " " +
        (y - py * 7)
      );
    }
    var bx = x + ox * 11,
      by = y + oy * 11;
    return (
      "M" +
      (bx + px * 7) +
      " " +
      (by + py * 7) +
      " L" +
      (bx - px * 7) +
      " " +
      (by - py * 7)
    );
  }

  function nodeAttrs(id, label, interactive) {
    return interactive
      ? 'data-id="' +
          id +
          '" tabindex="0" role="button" aria-pressed="false" aria-label="' +
          esc(label) +
          '"'
      : 'data-id="' + id + '"';
  }

  function lcFirst(t) {
    return t.charAt(0).toLowerCase() + t.slice(1);
  }

  // ----- Architecture --------------------------------------------------------------------
  function archSpec() {
    var W = 1100,
      H = 500;
    var N = [
      { id: "sidebar", x: 90, y: 420, w: 124, h: 46, title: "Sidebar" },
      {
        id: "app",
        x: 90,
        y: 270,
        w: 124,
        h: 46,
        title: "app.py",
        kind: "core",
      },
      {
        id: "tab1",
        x: 320,
        y: 130,
        w: 214,
        h: 66,
        title: "Performance metrics",
        sub: "scorecards, confusion matrix, ROC",
        kick: "tab 1",
      },
      {
        id: "tab2",
        x: 320,
        y: 270,
        w: 214,
        h: 66,
        title: "Slice explorer",
        sub: "slice animation",
        kick: "tab 2",
      },
      {
        id: "tab3",
        x: 320,
        y: 410,
        w: 214,
        h: 66,
        title: "Model diagnostics",
        sub: "table, bar chart, metrics",
        kick: "tab 3",
      },
      {
        id: "utils",
        x: 630,
        y: 130,
        w: 164,
        h: 48,
        title: "data_utils.py",
        kind: "core",
      },
      {
        id: "libs",
        x: 630,
        y: 270,
        w: 214,
        h: 54,
        title: "SciPy / NumPy / Matplotlib",
        kind: "lib",
      },
      {
        id: "data",
        x: 930,
        y: 130,
        w: 150,
        h: 48,
        title: "Data directory",
        kind: "store",
      },
      {
        id: "metrics",
        x: 930,
        y: 300,
        w: 176,
        h: 48,
        title: "Metrics JSON files",
        kind: "store",
      },
      {
        id: "csv",
        x: 920,
        y: 430,
        w: 214,
        h: 48,
        title: "fold_comparison_results.csv",
        kind: "store",
      },
    ];
    var E = [
      {
        a: "sidebar",
        b: "app",
        label: "Active model, patient ID, threshold",
        fs: "t",
        ts: "b",
      },
      { a: "app", b: "tab1", label: "Renders" },
      { a: "app", b: "tab2", label: "Renders" },
      { a: "app", b: "tab3", label: "Renders" },
      { a: "tab1", b: "utils", label: "Load NIfTI volume" },
      {
        a: "tab2",
        b: "utils",
        label: "Load NIfTI volume, list available patients",
      },
      { a: "tab2", b: "libs", label: "Erosion, dilation, zoom, heatmap" },
      {
        a: "utils",
        b: "libs",
        label: "Array manipulation, NIfTI loading",
        fs: "b",
        ts: "t",
      },
      { a: "utils", b: "data", label: "Reads scans, predictions and labels" },
      { a: "tab1", b: "metrics", label: "Reads AUROC, AP, FPR, TPR" },
      { a: "tab3", b: "metrics", label: "Reads model metrics" },
      { a: "tab3", b: "csv", label: "Reads via load_fold_comparison" },
    ];
    var byId = {};
    N.forEach(function (n) {
      byId[n.id] = n;
    });

    function anchor(n, side) {
      return side === "r"
        ? [n.x + n.w / 2, n.y]
        : side === "l"
          ? [n.x - n.w / 2, n.y]
          : side === "t"
            ? [n.x, n.y - n.h / 2]
            : [n.x, n.y + n.h / 2];
    }
    function route(e) {
      var A = byId[e.a],
        B = byId[e.b];
      var dx = B.x - A.x,
        dy = B.y - A.y;
      var fs = e.fs,
        ts = e.ts;
      if (!fs) {
        if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
          fs = dx > 0 ? "r" : "l";
          ts = dx > 0 ? "l" : "r";
        } else {
          fs = dy > 0 ? "b" : "t";
          ts = dy > 0 ? "t" : "b";
        }
      }
      var p1 = anchor(A, fs),
        p2 = anchor(B, ts);
      var horiz = fs === "r" || fs === "l";
      var k = Math.max(
        34,
        (horiz ? Math.abs(p2[0] - p1[0]) : Math.abs(p2[1] - p1[1])) * 0.45,
      );
      var s1 =
        fs === "r"
          ? [k, 0]
          : fs === "l"
            ? [-k, 0]
            : fs === "b"
              ? [0, k]
              : [0, -k];
      var s2 =
        ts === "l"
          ? [-k, 0]
          : ts === "r"
            ? [k, 0]
            : ts === "t"
              ? [0, -k]
              : [0, k];
      var c1 = [p1[0] + s1[0], p1[1] + s1[1]],
        c2 = [p2[0] + s2[0], p2[1] + s2[1]];
      return {
        d:
          "M" +
          p1[0] +
          " " +
          p1[1] +
          " C" +
          c1[0] +
          " " +
          c1[1] +
          " " +
          c2[0] +
          " " +
          c2[1] +
          " " +
          p2[0] +
          " " +
          p2[1],
        mx: (p1[0] + 3 * c1[0] + 3 * c2[0] + p2[0]) / 8,
        my: (p1[1] + 3 * c1[1] + 3 * c2[1] + p2[1]) / 8,
      };
    }
    function poly(n) {
      var x = n.x - n.w / 2,
        y = n.y - n.h / 2,
        w = n.w,
        h = n.h,
        c = 7;
      return [
        [x + c, y],
        [x + w - c, y],
        [x + w, y + c],
        [x + w, y + h - c],
        [x + w - c, y + h],
        [x + c, y + h],
        [x, y + h - c],
        [x, y + c],
      ]
        .map(function (q) {
          return q[0] + "," + q[1];
        })
        .join(" ");
    }
    function name(id) {
      return byId[id].title;
    }

    return {
      idle: "hover or tab to a component to see what it reads and sends.",
      build: function (uid, aria, interactive) {
        var s = svgOpen(
          uid,
          W,
          H,
          aria ||
            "Architecture of the dashboard: the sidebar and app.py feed three tabs, which read data through data_utils.py, the metrics files and a results table",
        );
        s += '<rect class="dg-group" x="186" y="62" width="268" height="398"/>';
        s +=
          '<text class="dg-label" x="200" y="82">Streamlit and Plotly</text>';
        var labels = "";
        E.forEach(function (e) {
          var r = route(e);
          s +=
            '<g class="dg-edge" data-a="' +
            e.a +
            '" data-b="' +
            e.b +
            '"><path class="dg-wire" d="' +
            r.d +
            '" marker-end="url(#' +
            uid +
            '-ah)"/></g>';
          labels +=
            '<g class="dg-edge" data-a="' +
            e.a +
            '" data-b="' +
            e.b +
            '"><text class="dg-elabel" x="' +
            r.mx.toFixed(0) +
            '" y="' +
            (r.my - 6).toFixed(0) +
            '" text-anchor="middle">' +
            esc(e.label) +
            "</text></g>";
        });
        N.forEach(function (n) {
          var half = n.w / 2,
            kind = n.kind || "ui";
          s +=
            '<g class="dg-node ' +
            kind +
            '" ' +
            nodeAttrs(n.id, n.title, interactive) +
            '><polygon class="dg-box" points="' +
            poly(n) +
            '"/>';
          if (n.kick)
            s +=
              '<text class="dg-kick" x="' +
              (n.x - half + 10) +
              '" y="' +
              (n.y - n.h / 2 + 14) +
              '">' +
              n.kick +
              "</text>";
          s +=
            '<text class="dg-title" x="' +
            n.x +
            '" y="' +
            (n.sub ? n.y + 2 : n.y + 4) +
            '" text-anchor="middle">' +
            esc(n.title) +
            "</text>";
          if (n.sub)
            s +=
              '<text class="dg-sub" x="' +
              n.x +
              '" y="' +
              (n.y + 18) +
              '" text-anchor="middle">' +
              esc(n.sub) +
              "</text>";
          s += "</g>";
        });
        s += labels;
        return s + "</svg>";
      },
      neighbours: function (id) {
        var out = [];
        E.forEach(function (e) {
          if (e.a === id) out.push(e.b);
          else if (e.b === id) out.push(e.a);
        });
        return out;
      },
      describe: function (id) {
        var out = E.filter(function (e) {
          return e.a === id;
        }).map(function (e) {
          return lcFirst(e.label) + " to " + name(e.b);
        });
        var inn = E.filter(function (e) {
          return e.b === id;
        }).map(function (e) {
          return name(e.a) + " (" + lcFirst(e.label) + ")";
        });
        return (
          name(id) +
          (out.length ? ": " + out.join("; ") + "." : ".") +
          (inn.length ? " Receives from " + inn.join("; ") + "." : "")
        );
      },
    };
  }

  // -------- Database Schema -------------------------------------------------------------------
  function schemaSpec() {
    var W = 960,
      H = 540,
      EW = 180;
    var T = [
      {
        id: "artist",
        x: 40,
        y: 36,
        t: "artists",
        f: [["artist_name"], ["genre"], ["image_url"]],
      },
      {
        id: "album",
        x: 40,
        y: 214,
        t: "albums",
        f: [["title"], ["artist_id", "fk"], ["release_date"], ["genre"]],
      },
      {
        id: "song",
        x: 40,
        y: 404,
        t: "songs",
        f: [["title"], ["album_id", "fk"], ["duration"], ["track_number"]],
      },
      {
        id: "fav",
        x: 390,
        y: 60,
        t: "user favourites",
        f: [
          ["id", "pk"],
          ["user_id", "fk"],
          ["album_id", "fk"],
        ],
      },
      {
        id: "user",
        x: 740,
        y: 36,
        t: "users",
        f: [["name"], ["email"], ["password"], ["user_admin"]],
      },
      {
        id: "profile",
        x: 740,
        y: 196,
        t: "profiles",
        f: [["user_id", "fk"], ["bio"], ["profile_picture"]],
      },
      {
        id: "rate",
        x: 390,
        y: 290,
        t: "rates",
        f: [
          ["user_id", "fk"],
          ["album_id", "fk"],
          ["score"],
          ["title"],
          ["comment"],
        ],
      },
      {
        id: "comment",
        x: 740,
        y: 396,
        t: "comments",
        f: [["content"], ["user_id", "fk"], ["rate_id", "fk"]],
      },
    ];
    // one table on the "one" side, one on the "many" side
    var R = [
      {
        a: "artist",
        b: "album",
        many: true,
        pts: [
          [130, 118],
          [130, 214],
        ],
        text: "An artist has many albums.",
      },
      {
        a: "album",
        b: "song",
        many: true,
        pts: [
          [130, 314],
          [130, 404],
        ],
        text: "An album has many songs.",
      },
      {
        a: "artist",
        b: "song",
        many: true,
        pts: [
          [40, 77],
          [16, 77],
          [16, 454],
          [40, 454],
        ],
        text: "An artist has many songs.",
      },
      {
        a: "album",
        b: "fav",
        many: true,
        pts: [
          [220, 250],
          [300, 250],
          [300, 101],
          [390, 101],
        ],
        text: "An album can be favourited many times.",
      },
      {
        a: "user",
        b: "fav",
        many: true,
        pts: [
          [740, 96],
          [570, 96],
        ],
        text: "A user has many favourites.",
      },
      {
        a: "album",
        b: "rate",
        many: true,
        pts: [
          [220, 290],
          [330, 290],
          [330, 340],
          [390, 340],
        ],
        text: "An album has many reviews, each with a score, title and comment.",
      },
      {
        a: "user",
        b: "rate",
        many: true,
        pts: [
          [740, 120],
          [650, 120],
          [650, 330],
          [570, 330],
        ],
        text: "A user writes many reviews.",
      },
      {
        a: "user",
        b: "profile",
        many: false,
        pts: [
          [830, 136],
          [830, 196],
        ],
        text: "A user has exactly one profile.",
      },
      {
        a: "user",
        b: "comment",
        many: true,
        pts: [
          [920, 70],
          [948, 70],
          [948, 437],
          [920, 437],
        ],
        text: "A user writes many comments.",
      },
      {
        a: "rate",
        b: "comment",
        many: true,
        pts: [
          [570, 380],
          [655, 380],
          [655, 437],
          [740, 437],
        ],
        text: "A review has many comments.",
      },
    ];
    var byId = {};
    T.forEach(function (t) {
      byId[t.id] = t;
    });
    function unit(a, b) {
      var dx = b[0] - a[0],
        dy = b[1] - a[1],
        l = Math.hypot(dx, dy) || 1;
      return [dx / l, dy / l];
    }

    return {
      idle: "hover or tab to a table to see how it relates to the others.",
      build: function (uid, aria, interactive) {
        var s = svgOpen(
          uid,
          W,
          H,
          aria ||
            "Database schema: eight tables for artists, albums, songs, users, profiles, favourites, reviews and comments",
        );
        R.forEach(function (r) {
          var p = r.pts,
            n = p.length;
          var u0 = unit(p[0], p[1]),
            u1 = unit(p[n - 1], p[n - 2]);
          // the "one" end is the parent table (a); the "many" end is the child (b)
          s +=
            '<g class="dg-edge dg-rel" data-a="' +
            r.a +
            '" data-b="' +
            r.b +
            '"><path class="dg-line" d="' +
            roundedPath(p, 9) +
            '"/>' +
            '<path class="dg-end" d="' +
            endGlyph(p[0][0], p[0][1], u0[0], u0[1], false) +
            '"/>' +
            '<path class="dg-end" d="' +
            endGlyph(p[n - 1][0], p[n - 1][1], u1[0], u1[1], r.many) +
            '"/></g>';
        });
        T.forEach(function (t) {
          var h = 24 + t.f.length * 18 + 4;
          s +=
            '<g class="dg-node dg-table" ' +
            nodeAttrs(t.id, t.t + " table", interactive) +
            ">" +
            '<rect class="dg-body" x="' +
            t.x +
            '" y="' +
            t.y +
            '" width="' +
            EW +
            '" height="' +
            h +
            '"/>' +
            '<rect class="dg-head" x="' +
            t.x +
            '" y="' +
            t.y +
            '" width="' +
            EW +
            '" height="24"/>' +
            '<text class="dg-title" x="' +
            (t.x + 10) +
            '" y="' +
            (t.y + 16) +
            '">' +
            esc(t.t) +
            "</text>";
          t.f.forEach(function (f, i) {
            var y = t.y + 24 + i * 18 + 13;
            s +=
              '<text class="dg-field" x="' +
              (t.x + 10) +
              '" y="' +
              y +
              '">' +
              esc(f[0]) +
              "</text>";
            if (f[1])
              s +=
                '<text class="dg-key" x="' +
                (t.x + EW - 10) +
                '" y="' +
                y +
                '" text-anchor="end">' +
                f[1] +
                "</text>";
          });
          s += "</g>";
        });
        // legend
        s +=
          '<path class="dg-end" d="' +
          endGlyph(400, 522, 1, 0, false) +
          '"/><path class="dg-line" d="M400 522 L430 522"/><text class="dg-label" x="438" y="526">one</text>';
        s +=
          '<path class="dg-end" d="' +
          endGlyph(500, 522, 1, 0, true) +
          '"/><path class="dg-line" d="M500 522 L530 522"/><text class="dg-label" x="538" y="526">many</text>';
        return s + "</svg>";
      },
      neighbours: function (id) {
        var out = [];
        R.forEach(function (r) {
          if (r.a === id) out.push(r.b);
          else if (r.b === id) out.push(r.a);
        });
        return out;
      },
      describe: function (id) {
        var rel = R.filter(function (r) {
          return r.a === id || r.b === id;
        }).map(function (r) {
          return r.text;
        });
        return byId[id].t + ": " + rel.join(" ");
      },
    };
  }

  var GRAPHS = { "mri-arch": archSpec, "mm-erd": schemaSpec };

  // Hover, focus or click a node: what it touches lights up, the rest recede.
  function wireGraph(host, spec, say, idle) {
    var st = { hover: null, pinned: null };
    var nodes = host.querySelectorAll(".dg-node");
    var edges = host.querySelectorAll(".dg-edge");

    function apply() {
      var sel = st.hover || st.pinned;
      var near = {};
      if (sel)
        spec.neighbours(sel).forEach(function (id) {
          near[id] = true;
        });
      nodes.forEach(function (n) {
        var id = n.getAttribute("data-id");
        n.classList.toggle("is-sel", id === sel);
        n.classList.toggle("is-src", !!near[id]);
        n.classList.toggle("is-dim", !!sel && id !== sel && !near[id]);
        n.setAttribute("aria-pressed", String(id === st.pinned));
      });
      edges.forEach(function (e) {
        var on =
          !!sel &&
          (e.getAttribute("data-a") === sel ||
            e.getAttribute("data-b") === sel);
        e.classList.toggle("is-lit", on);
        e.classList.toggle("is-dim", !!sel && !on);
      });
      say(sel ? spec.describe(sel) : idle);
    }
    host.addEventListener("mouseover", function (e) {
      var n = e.target.closest(".dg-node");
      if (n) {
        st.hover = n.getAttribute("data-id");
        apply();
      }
    });
    host.addEventListener("mouseleave", function () {
      st.hover = null;
      apply();
    });
    host.addEventListener("focusin", function (e) {
      var n = e.target.closest(".dg-node");
      if (n) {
        st.hover = n.getAttribute("data-id");
        apply();
      }
    });
    host.addEventListener("focusout", function () {
      st.hover = null;
      apply();
    });
    host.addEventListener("click", function (e) {
      var n = e.target.closest(".dg-node");
      if (!n) return;
      var id = n.getAttribute("data-id");
      st.pinned = st.pinned === id ? null : id;
      apply();
    });
    host.addEventListener("keydown", function (e) {
      var n = e.target.closest && e.target.closest(".dg-node");
      if (n && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        n.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
    apply();
  }

  function screens(p) {
    var ratio = p.imageRatio || "16 / 9";
    var fit = p.imageFit || "cover";
    var uid = "gs" + ++diagramUid;
    var shots = [
      {
        src: p.image,
        alt: p.imageAlt || "",
        caption: p.imageCaption || "Landing page",
      },
    ].concat(
      (p.gallery || []).filter(function (g) {
        return g && (g.src || g.graph);
      }),
    );

    var stage = el("div", {
      class: "screen-stage",
      style: "aspect-ratio:" + ratio,
    });
    var caption = el("p", {
      class: "screen-caption",
      role: "status",
      "aria-live": "polite",
    });
    var current = null;

    // A slide is either a screenshot or a generated diagram. Screenshots
    // open in the lightbox; diagrams are already full size and interactive.
    function showShot(g) {
      current = g;
      stage.innerHTML = "";
      stage.classList.toggle("is-graph", !!g.graph);
      stage.style.aspectRatio = g.graph ? "auto" : ratio;
      if (g.graph && GRAPHS[g.graph]) {
        var spec = GRAPHS[g.graph]();
        var host = el("div", { class: "dg-svg dg-green" });
        host.innerHTML = spec.build(uid + "-main", g.alt, true);
        stage.appendChild(host);
        wireGraph(
          host,
          spec,
          function (t) {
            caption.textContent = t;
          },
          g.caption || "",
        );
        return;
      }
      var img = el("img", {
        class: "project-img",
        style: "object-fit:" + fit + ";",
        src: g.src,
        alt: g.alt || "",
      });
      var open = el(
        "button",
        {
          type: "button",
          class: "screen-main",
          "aria-label": "Enlarge screenshot",
        },
        [img],
      );
      open.addEventListener("click", function () {
        openLightbox(g.src, g.alt, g.caption);
      });
      stage.appendChild(open);
      caption.textContent = g.caption || "";
    }
    showShot(shots[0]);

    var frame = el("div", { class: "project-shot" }, [
      el("div", { class: "shot-chrome", "aria-hidden": "true" }, [
        el("span", { class: "shot-title", text: windowLabel(p) }),
      ]),
      stage,
    ]);

    var thumbs = null;
    if (shots.length > 1) {
      var buttons = shots.map(function (g, i) {
        var face;
        if (g.graph && GRAPHS[g.graph]) {
          // a miniature of the same drawing, not interactive
          face = el("div", {
            class: "thumb-graph dg-green",
            "aria-hidden": "true",
          });
          face.innerHTML = GRAPHS[g.graph]().build(uid + "-t" + i, "", false);
        } else {
          face = el("img", { src: g.src, alt: "", loading: "lazy" });
        }
        var b = el(
          "button",
          {
            type: "button",
            class: "thumb",
            "aria-pressed": String(i === 0),
            "aria-label": "Show: " + (g.caption || "slide " + (i + 1)),
          },
          [face],
        );
        b.addEventListener("click", function () {
          if (g === current) return;
          buttons.forEach(function (x) {
            x.setAttribute("aria-pressed", String(x === b));
          });
          // fade out, swap once the fade has run, fade back in
          stage.classList.add("is-swap");
          window.setTimeout(
            function () {
              showShot(g);
              stage.classList.remove("is-swap");
            },
            reducedMotion() ? 0 : 160,
          );
        });
        return b;
      });
      thumbs = el(
        "div",
        {
          class: "screen-thumbs",
          role: "group",
          "aria-label": "Screenshots and diagrams",
        },
        buttons,
      );
    }

    return el("div", {}, [frame, caption, thumbs]);
  }

  function projectCard(p) {
    var links = (p.links || [])
      .filter(function (l) {
        return l && l.url;
      })
      .map(function (l) {
        var a = link(l.label, l.url, "btn btn-small");
        a.setAttribute("aria-label", l.label + " for " + p.title);
        return a;
      });

    // Screenshots lead when there are any, and a diagram then follows the
    // text. A project with only a diagram leads with that instead.
    var hero = p.image
      ? screens(p)
      : p.diagram
        ? renderDiagram(p.diagram)
        : null;
    var after = p.image && p.diagram ? renderDiagram(p.diagram) : null;

    var aside = [
      links.length ? el("div", { class: "actions" }, links) : null,
      has(p.tech)
        ? el(
            "ul",
            { class: "chips", "aria-label": "Technologies used" },
            p.tech.map(chip),
          )
        : null,
      p.note ? el("p", { class: "project-note", text: p.note }) : null,
    ].filter(Boolean);

    return el("article", { class: "project reveal" }, [
      hero ? el("div", { class: "project-media" }, [hero]) : null,
      el("div", { class: "project-body" }, [
        el("div", { class: "project-main" }, [
          p.context
            ? el("p", { class: "project-context", text: p.context })
            : null,
          el("h3", { text: p.title }),
          p.summary ? el("p", { class: "lead", text: p.summary }) : null,
          has(p.highlights)
            ? el(
                "ul",
                { class: "highlights" },
                p.highlights.map(function (h) {
                  return el("li", { text: h });
                }),
              )
            : null,
          p.feature
            ? el("div", { class: "feature" }, [
                el("h4", { text: p.feature.title }),
                p.feature.text ? el("p", { text: p.feature.text }) : null,
                has(p.feature.points)
                  ? el(
                      "ul",
                      { class: "feature-list" },
                      p.feature.points.map(function (t) {
                        return el("li", { text: t });
                      }),
                    )
                  : null,
              ])
            : null,
          p.outcome
            ? el("div", { class: "outcome" }, [
                el("h4", { text: "Result" }),
                el("p", { text: p.outcome }),
              ])
            : null,
        ]),
        aside.length ? el("aside", { class: "project-aside" }, aside) : null,
      ]),
      after ? el("div", { class: "project-diagram" }, [after]) : null,
    ]);
  }

  function renderProjects() {
    if (!has(S.projects)) return hideSection("projects");
    mount("project-list", S.projects.map(projectCard));
  }

  // ---- Toolkit -------------------------------------------------------------
  // Simplified language marks, inlined so the page needs no icon library.
  // All of them use currentColor, so they pick up the accent on hover and
  // re-theme in dark mode without a second set of files.

  var LANG_ICONS = {
    python:
      '<path d="M11.9 2.2c-2.6 0-4.4.8-4.4 2.9v2.3h4.6v.7H5.7C3.5 8.1 2.3 9.6 2.3 12s1.2 3.9 3.4 3.9h1.6v-2.8c0-2.2 1.8-4 4-4h3.9c1.4 0 2.6-1.2 2.6-2.6V5.1c0-1.9-1.8-2.9-4.3-2.9h-1.6Zm-2.3 1.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>' +
      '<path d="M12.1 21.8c2.6 0 4.4-.8 4.4-2.9v-2.3h-4.6v-.7h6.4c2.2 0 3.4-1.5 3.4-3.9s-1.2-3.9-3.4-3.9h-1.6v2.8c0 2.2-1.8 4-4 4H8.8c-1.4 0-2.6 1.2-2.6 2.6v2.4c0 1.9 1.8 2.9 4.3 2.9h1.6Zm2.3-1.6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>',
    java:
      '<path d="M6.8 12.6h10v3.7a3.2 3.2 0 0 1-3.2 3.2h-3.6a3.2 3.2 0 0 1-3.2-3.2v-3.7Z"/>' +
      '<path d="M17.3 13.5h1a1.9 1.9 0 0 1 0 3.8h-1v-1.4h.9a.5.5 0 0 0 0-1h-.9v-1.4Z"/>' +
      '<rect x="5.6" y="20.4" width="12.4" height="1.5" rx="0.7"/>' +
      '<path d="M10.2 2.8c-1.9 1.6-.4 2.7.2 3.5.7.9.6 1.7-.6 2.8 1.9-.9 3.2-2.1 2.4-3.4-.5-.8-1.7-1.4-2-2.9Z"/>' +
      '<path d="M13.6 5.5c-1.3 1.1-.3 1.9.1 2.5.5.7.4 1.3-.4 2 1.4-.6 2.3-1.5 1.7-2.4-.3-.6-1.2-1-1.4-2.1Z"/>',
    cpp:
      '<path d="M12 2.3 20.8 7.4v9.2L12 21.7 3.2 16.6V7.4L12 2.3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<text x="12" y="14.9" text-anchor="middle" font-size="7" font-weight="700">C++</text>',
    c:
      '<path d="M12 2.3 20.8 7.4v9.2L12 21.7 3.2 16.6V7.4L12 2.3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<text x="12" y="15.4" text-anchor="middle" font-size="9" font-weight="700">C</text>',
    sql:
      '<ellipse cx="12" cy="6" rx="7.6" ry="3" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M4.4 6v12c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3V6" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M4.4 12c0 1.7 3.4 3 7.6 3s7.6-1.3 7.6-3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    php:
      '<ellipse cx="12" cy="12" rx="10.6" ry="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<text x="12" y="14.6" text-anchor="middle" font-size="7" font-weight="700">php</text>',
    html:
      '<path d="M4.2 2.6h15.6l-1.4 16.2L12 21.4l-6.4-2.6L4.2 2.6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<text x="12" y="14.6" text-anchor="middle" font-size="7" font-weight="700">&lt;/&gt;</text>',
    css:
      '<path d="M4.2 2.6h15.6l-1.4 16.2L12 21.4l-6.4-2.6L4.2 2.6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<text x="12" y="14.9" text-anchor="middle" font-size="8" font-weight="700">{ }</text>',
    ada:
      '<rect x="2.6" y="2.6" width="18.8" height="18.8" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<text x="12" y="15.2" text-anchor="middle" font-size="7" font-weight="700">Ada</text>',
  };

  function langIcon(name) {
    var glyph = LANG_ICONS[name];
    if (!glyph) return null;
    return markup(
      '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" ' +
        'aria-hidden="true" focusable="false">' +
        glyph +
        "</svg>",
      { class: "lang-icon" },
    );
  }

  function renderToolkit() {
    var t = S.toolkit || {};
    if (!has(t.languages) && !has(t.groups)) return hideSection("toolkit");

    setText("toolkit-blurb", t.blurb);

    mount(
      "languages",
      (t.languages || []).map(function (l, i) {
        return el("li", { class: "lang reveal", style: "--i:" + i }, [
          langIcon(l.icon),
          el("span", { class: "lang-name", text: l.name }),
          l.note ? el("span", { class: "lang-note", text: l.note }) : null,
        ]);
      }),
    );

    mount(
      "skill-groups",
      (t.groups || []).map(function (g) {
        return el("div", { class: "skill-group reveal" }, [
          el("h3", { text: g.title }),
          el("ul", { class: "chips" }, (g.items || []).map(chip)),
        ]);
      }),
    );
  }

  // ---- Background Timeline -------------------------------------------------

  function renderTimeline() {
    if (!has(S.timeline)) return hideSection("background");

    mount(
      "timeline",
      S.timeline.map(function (t) {
        return el("li", { class: "tl-item reveal" }, [
          el("p", { class: "tl-when", text: t.when }),
          el("div", { class: "tl-body" }, [
            el("h3", { text: t.title }),
            t.place ? el("p", { class: "tl-place", text: t.place }) : null,
            t.detail ? el("p", { class: "tl-detail", text: t.detail }) : null,
            has(t.tags) ? el("ul", { class: "chips" }, t.tags.map(chip)) : null,
          ]),
        ]);
      }),
    );
  }

  // ---- Stats that count up when they scroll into view ----------------------

  // Monospace makes a scramble read as deliberate rather than broken: the
  // digits never reflow, so only the glyphs change.
  // ---- Motion: reveal on scroll --------------------------------------------

  function reducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function initReveal() {
    var targets = doc.querySelectorAll(".reveal");
    if (!targets.length) return;

    if (reducedMotion() || !("IntersectionObserver" in window)) {
      targets.forEach(function (n) {
        n.classList.add("in");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    targets.forEach(function (n) {
      io.observe(n);
    });
  }

  // Marks the nav link for whichever section is currently in view.
  function renderNow() {
    var n = S.now || {};
    var shown = 0;

    if (has(n.learning)) {
      byId("now-learning").classList.add("reveal");
      mount("now-learning", [
        el("h3", { text: "Currently working on:" }),
        el(
          "ul",
          { class: "plain-list" },
          n.learning.map(function (item) {
            return el("li", { text: item });
          }),
        ),
      ]);
      shown++;
    } else {
      var l = byId("now-learning");
      if (l) l.hidden = true;
    }

    if (n.nextUp && n.nextUp.title) {
      byId("now-next").classList.add("reveal");
      mount("now-next", [
        el("h3", { text: "Next up:" }),
        el("p", { class: "next-title" }, [
          el("strong", { text: n.nextUp.title }),
          n.nextUp.status
            ? el("span", { class: "chip chip-status", text: n.nextUp.status })
            : null,
        ]),
        n.nextUp.description ? el("p", { text: n.nextUp.description }) : null,
      ]);
      shown++;
    } else {
      var nx = byId("now-next");
      if (nx) nx.hidden = true;
    }

    if (!shown) hideSection("now");
  }

  function renderContact() {
    var c = S.contact || {};
    var links = [];
    if (c.email) {
      links.push(
        link(
          c.emailLabel || "Email me",
          "mailto:" + c.email,
          "btn btn-primary",
        ),
      );
    }
    (c.links || []).forEach(function (l) {
      if (l && l.url) links.push(link(l.label, l.url, "btn"));
    });
    if (!c.blurb && !links.length) return hideSection("contact");
    setText("contact-blurb", c.blurb);
    mount("contact-links", links);

    // The address itself still needs to be visible and copyable
    var addr = byId("contact-address");
    if (!addr) return;
    if (c.email) {
      mount("contact-address", [
        doc.createTextNode("or write to "),
        link(c.email, "mailto:" + c.email),
      ]);
    } else {
      addr.hidden = true;
    }
  }

  // ---- Pages ---------------------------------------------------------------
  // The site is one file, shown a page at a time. Each page is a window in the
  // status bar at the foot of the screen, numbered the way tmux numbers them.
  // The first page carries the masthead and the power lines as well as About.

  var PAGES = [
    { id: "about", label: "about", title: "", also: ["top", "wire-band"] },
    { id: "projects", label: "projects", title: "Projects" },
    { id: "toolkit", label: "toolkit", title: "Toolkit" },
    { id: "background", label: "background", title: "Background" },
    { id: "now", label: "now", title: "Right now" },
    { id: "contact", label: "contact", title: "Contact" },
  ];
  var currentPage = "";
  var baseTitle = doc.title;

  function pageIndex(id) {
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return i;
    return -1;
  }

  // "#projects" names a page, "#top" means the first one, anything else
  // (the skip link's "#main", a typo) names none.
  function pageFromHash(hash) {
    var id = (hash || "").replace(/^#/, "");
    if (id === "top") id = PAGES[0].id;
    return pageIndex(id) === -1 ? "" : id;
  }

  function windowLink(p, n) {
    return el("a", { href: "#" + p.id, class: "tw", "data-page": p.id }, [
      el("span", { class: "tw-n", text: String(n) }),
      el("span", { class: "tw-l", text: ":" + p.label }),
      el("span", { class: "tw-f", "aria-hidden": "true", text: "*" }),
    ]);
  }

  function renderNav() {
    // a section the config left empty is not a page
    PAGES = PAGES.filter(function (p) {
      var s = byId(p.id);
      return s && !s.hidden;
    });
    var bar = S.statusBar || {};
    var session =
      bar.session ||
      String(S.name || "")
        .split(" ")[0]
        .toLowerCase() ||
      "main";
    var clock = el("span", { class: "tmux-clock" });
    function tick() {
      var d = new Date();
      clock.textContent =
        ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    }
    tick();
    window.setInterval(tick, 15000);

    mount("tmux", [
      el("span", { class: "tmux-session", "aria-hidden": "true" }, [
        el("span", { class: "tmux-seg", text: "[" + session + "]" }),
        el("span", { class: "tmux-sep" }),
      ]),
      el(
        "ol",
        { class: "tmux-windows" },
        PAGES.map(function (p, i) {
          return el("li", {}, [windowLink(p, i + 1)]);
        }),
      ),
      el("span", { class: "tmux-right", "aria-hidden": "true" }, [
        bar.right === "" ? null : el("span", { text: bar.right || "bristol" }),
        clock,
      ]),
    ]);
  }

  // Previous and next, at the foot of every page.
  function renderPager(i) {
    var prev = PAGES[i - 1];
    var next = PAGES[i + 1];
    mount("pager", [
      prev
        ? el("a", { href: "#" + prev.id, class: "pager-prev", rel: "prev" }, [
            el("span", { "aria-hidden": "true", text: "<- " }),
            el("span", { class: "sr-only", text: "Previous page: " }),
            el("span", { text: i + ":" + prev.label }),
          ])
        : el("span"),
      next
        ? el("a", { href: "#" + next.id, class: "pager-next", rel: "next" }, [
            el("span", { class: "sr-only", text: "Next page: " }),
            el("span", { text: i + 2 + ":" + next.label }),
            el("span", { "aria-hidden": "true", text: " ->" }),
          ])
        : el("span"),
    ]);
  }

  // Show one page and put everything else away. `how.push` writes a history
  // entry, so Back returns to the page before; `how.focus` moves keyboard
  // focus to the new page's heading, so a screen reader announces it.
  function showPage(id, how) {
    how = how || {};
    var i = pageIndex(id);
    if (i === -1) i = 0;
    var page = PAGES[i];
    var changed = page.id !== currentPage;
    currentPage = page.id;

    PAGES.forEach(function (p) {
      [p.id].concat(p.also || []).forEach(function (part) {
        var n = byId(part);
        if (!n) return;
        n.classList.toggle("page-off", p !== page);
        n.classList.toggle("page-in", p === page && changed && !!how.animate);
      });
    });

    var links = doc.querySelectorAll("#tmux .tw");
    for (var k = 0; k < links.length; k++) {
      if (links[k].getAttribute("data-page") === page.id)
        links[k].setAttribute("aria-current", "page");
      else links[k].removeAttribute("aria-current");
    }
    renderPager(i);
    doc.title = page.title ? page.title + " | " + S.name : baseTitle;
    root.setAttribute("data-page", page.id);

    if (how.push && changed) {
      var url = window.location.pathname + window.location.search;
      history.pushState(null, "", i === 0 ? url : url + "#" + page.id);
    }
    jump(0);
    // anything that measures itself (the rails, the drawings) was laid out
    // while its page was hidden, so let it measure again
    window.dispatchEvent(new Event("resize"));

    if (how.focus && changed) {
      var heading = i === 0 ? byId("hero-name") : byId(page.id + "-title");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }

  function initPages() {
    doc.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var id = pageFromHash(a.getAttribute("href"));
      if (!id) return;
      e.preventDefault();
      showPage(id, { push: true, focus: true, animate: !reducedMotion() });
    });

    // Back, Forward, and a #page typed into the address bar
    function fromAddress() {
      var id = pageFromHash(window.location.hash);
      if (!id && window.location.hash) return; // not a page: leave things be
      showPage(id || PAGES[0].id, { animate: !reducedMotion() });
    }
    window.addEventListener("popstate", fromAddress);
    window.addEventListener("hashchange", fromAddress);

    // 1 to 6 pick a window; n and p step to the next and the previous
    doc.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      var t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t && t.isContentEditable) return;
      if (doc.querySelector("dialog[open]")) return;
      var i = pageIndex(currentPage);
      var to = -1;
      if (/^[1-9]$/.test(e.key)) to = Number(e.key) - 1;
      else if (e.key === "n") to = i + 1;
      else if (e.key === "p") to = i - 1;
      if (to < 0 || to >= PAGES.length || to === i) return;
      showPage(PAGES[to].id, {
        push: true,
        focus: true,
        animate: !reducedMotion(),
      });
    });

    // A reload or a shared link opens on the page it names, at the top.
    showPage(pageFromHash(window.location.hash) || PAGES[0].id);
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) jump(0);
    });
  }

  function renderFooter() {
    var year = new Date().getFullYear();
    var parts = ["© " + year + " " + S.name];
    if (S.footer) parts.push(S.footer);
    setText("footer-text", parts.join(" · "));
  }

  // In-page links scroll without writing to the URL. Clicking through the
  // nav and then reloading should leave you at the top, not wherever you
  // happened to be reading. A typed or shared #fragment still works.
  function jump(top) {
    var st = root.style;
    var prev = st.scrollBehavior;
    st.scrollBehavior = "auto";
    window.scrollTo(0, top);
    st.scrollBehavior = prev;
  }

  // page, so by the time the section exists it has moved somewhere else.
  // Put the scroll position right once we are done. A typed or shared link to
  // a #section still lands on it, but a refresh always starts at the top, even
  // if the address bar still carries a #section from an earlier click.
  // Some browsers restore the old position late, after the script has run, or
  // when a page comes back from the back/forward cache. If nobody has touched
  // the page yet, put it back at the start.
  // ---- Easter egg: Konami code ---------------------------------------------

  function initEasterEgg() {
    if (S.easterEgg === false) return;
    if (S.consoleMessage) console.log(S.consoleMessage);

    var code = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    var pos = 0;

    doc.addEventListener("keydown", function (e) {
      var key = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === code[pos]) pos++;
      else pos = key === code[0] ? 1 : 0;

      if (pos === code.length) {
        pos = 0;
        doc.body.classList.toggle("party");
      }
    });
  }

  // ---- Go ------------------------------------------------------------------

  // One failing piece of decoration must never take navigation down with it.
  function safely(fn) {
    try {
      fn();
    } catch (err) {
      if (window.console) console.error(fn.name + " failed", err);
    }
  }

  applyTheme();
  applyMeta();
  renderHero();
  renderAbout();
  renderProjects();
  renderToolkit();
  renderTimeline();
  renderNow();
  renderContact();
  renderNav(); // after the sections, so it only lists ones that are visible
  renderFooter();

  // Paging comes before anything decorative, so it works even if something
  // below throws.
  initPages();

  [
    initEasterEgg,
    initHeroArt,
    initEdgeArt,
    initWires,
    initReveal, // after everything is mounted, or there is nothing to observe
  ].forEach(safely);
})();
