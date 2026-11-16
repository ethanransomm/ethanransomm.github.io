// The interactive drawings: the three model-architecture diagrams on the
// dissertation page, and the two drawn gallery slides (the dashboard's
// architecture and the Music Musings database schema).
//
// This is the drawing code from the previous version of the site, carried
// over whole so that nothing in it is lost. It is plain JavaScript, and
// importing it touches nothing in the page: the two graph specs build their
// SVG as text, so they can be drawn when the site is built, and everything
// that needs the browser waits until one of the exported functions is called.

/* eslint-disable */
// @ts-nocheck

  // Build an element. props: class, text, or any attribute. null/false are skipped.
  function el(tag, props, kids) {
    var node = document.createElement(tag);
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

  // Parse a string of SVG markup into real nodes. Safe here because every
  // string below is authored in this file, never user input.
  function markup(str, hostProps) {
    var host = el("div", hostProps || {});
    host.innerHTML = str;
    return host;
  }

  function reducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
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

  // ---- Drawn gallery slides ------------------------------------------------

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

export { renderDiagram, DIAGRAMS, GRAPHS, wireGraph };
