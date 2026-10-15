/* ============================================================
   CampusCred — js/components/charts.js
   Dependency-free SVG charts: bar, stacked bar, line/area,
   donut, horizontal bar. All re-render on filter changes.
   ============================================================ */
(function (global) {
  'use strict';
  const UI = global.CC.UI;

  const PALETTE = ['#2563EB', '#16A34A', '#D97706', '#EF4444', '#7C3AED', '#0891B2', '#DB2777', '#64748B'];

  function tooltipLayer() {
    let tip = document.querySelector('.chart-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      document.body.appendChild(tip);
    }
    return tip;
  }

  function bindHover(svg) {
    const tip = tooltipLayer();
    svg.querySelectorAll('[data-tip]').forEach(function (node) {
      node.addEventListener('mousemove', function (e) {
        tip.textContent = node.getAttribute('data-tip');
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top = (e.clientY - 10) + 'px';
        tip.classList.add('show');
      });
      node.addEventListener('mouseleave', function () { tip.classList.remove('show'); });
    });
  }

  const Charts = {
    palette: PALETTE,

    /* ----------------------------------------------------------
       Grouped/stacked vertical bar chart.
       data: [{ label, values:[n,...] }]  series: [{name,color}]
       ---------------------------------------------------------- */
    bar: function (opts) {
      const data = opts.data || [];
      const series = opts.series || [{ name: 'Value', color: PALETTE[0] }];
      const stacked = !!opts.stacked;
      const W = 640, H = opts.height || 260;
      const padL = 42, padR = 12, padT = 16, padB = 34;
      const iw = W - padL - padR, ih = H - padT - padB;

      let max = 1;
      data.forEach(function (d) {
        if (stacked) {
          const sum = d.values.reduce(function (a, b) { return a + b; }, 0);
          if (sum > max) max = sum;
        } else {
          d.values.forEach(function (v) { if (v > max) max = v; });
        }
      });
      const niceMax = Math.max(4, Math.ceil(max / 4) * 4);

      let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img">';

      // gridlines + y labels
      const ticks = 4;
      for (let t = 0; t <= ticks; t++) {
        const y = padT + ih - (ih * t / ticks);
        const val = Math.round(niceMax * t / ticks);
        svg += '<line class="grid-line" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"/>';
        svg += '<text class="axis-label" x="' + (padL - 8) + '" y="' + (y + 3.5) + '" text-anchor="end">' + val + '</text>';
      }

      const groupW = iw / Math.max(1, data.length);
      const innerPad = groupW * 0.24;
      const barAreaW = groupW - innerPad;

      data.forEach(function (d, i) {
        const gx = padL + i * groupW;
        // x label (shrink long labels)
        let label = d.label;
        if (label.length > 9) label = label.slice(0, 8) + '…';
        svg += '<text class="axis-label" x="' + (gx + groupW / 2) + '" y="' + (H - 12) + '" text-anchor="middle">' + UI.esc(label) + '</text>';

        if (stacked) {
          let acc = 0;
          d.values.forEach(function (v, si) {
            const h = (v / niceMax) * ih;
            const y = padT + ih - h - acc;
            if (v > 0) {
              svg += '<rect class="bar" data-tip="' + UI.esc(d.label + ' — ' + series[si].name + ': ' + v) + '" ' +
                'x="' + (gx + innerPad / 2) + '" y="' + y + '" width="' + barAreaW + '" height="' + h + '" ' +
                'rx="3" fill="' + series[si].color + '"/>';
            }
            acc += h;
          });
        } else {
          const bw = barAreaW / d.values.length;
          d.values.forEach(function (v, si) {
            const h = (v / niceMax) * ih;
            const x = gx + innerPad / 2 + si * bw;
            const y = padT + ih - h;
            svg += '<rect class="bar" data-tip="' + UI.esc(d.label + ' — ' + series[si].name + ': ' + v) + '" ' +
              'x="' + (x + 1.5) + '" y="' + y + '" width="' + Math.max(2, bw - 3) + '" height="' + Math.max(0, h) + '" ' +
              'rx="3" fill="' + series[si].color + '"/>';
          });
        }
      });

      svg += '</svg>';
      return svg;
    },

    /* ----------------------------------------------------------
       Line / area chart with dots.
       data: [{ label, value }]
       ---------------------------------------------------------- */
    line: function (opts) {
      const data = opts.data || [];
      const color = opts.color || PALETTE[0];
      const W = 640, H = opts.height || 250;
      const padL = 42, padR = 14, padT = 18, padB = 34;
      const iw = W - padL - padR, ih = H - padT - padB;
      let max = 1;
      data.forEach(function (d) { if (d.value > max) max = d.value; });
      const niceMax = Math.max(4, Math.ceil(max / 4) * 4);

      function xAt(i) { return padL + (data.length <= 1 ? iw / 2 : (iw * i) / (data.length - 1)); }
      function yAt(v) { return padT + ih - (v / niceMax) * ih; }

      let svg = '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img">';
      const ticks = 4;
      for (let t = 0; t <= ticks; t++) {
        const y = padT + ih - (ih * t / ticks);
        svg += '<line class="grid-line" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"/>';
        svg += '<text class="axis-label" x="' + (padL - 8) + '" y="' + (y + 3.5) + '" text-anchor="end">' + Math.round(niceMax * t / ticks) + '</text>';
      }

      let linePath = '', areaPath = '';
      data.forEach(function (d, i) {
        const x = xAt(i), y = yAt(d.value);
        linePath += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        if (i === 0) areaPath = 'M' + x.toFixed(1) + ' ' + (padT + ih) + ' L' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        else areaPath += 'L' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        if (i === data.length - 1) areaPath += 'L' + x.toFixed(1) + ' ' + (padT + ih) + ' Z';
      });

      svg += '<defs><linearGradient id="lnGrad' + (opts.id || 'x') + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.28"/>' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.02"/></linearGradient></defs>';
      svg += '<path d="' + areaPath + '" fill="url(#lnGrad' + (opts.id || 'x') + ')"/>';
      svg += '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';

      data.forEach(function (d, i) {
        const x = xAt(i), y = yAt(d.value);
        svg += '<circle class="bar" data-tip="' + UI.esc(d.full || d.label + ': ' + d.value) + '" cx="' + x + '" cy="' + y + '" r="4.5" fill="#fff" stroke="' + color + '" stroke-width="2.5"/>';
        svg += '<text class="axis-label" x="' + x + '" y="' + (H - 12) + '" text-anchor="middle">' + UI.esc(d.label) + '</text>';
      });

      svg += '</svg>';
      return svg;
    },

    /* ----------------------------------------------------------
       Donut chart with center total + legend.
       data: [{ label, value, color? }]
       ---------------------------------------------------------- */
    donut: function (opts) {
      const data = (opts.data || []).filter(function (d) { return d.value > 0; });
      const size = opts.size || 190;
      const stroke = opts.thickness || 26;
      const r = (size - stroke) / 2;
      const cx = size / 2, cy = size / 2;
      const circ = 2 * Math.PI * r;
      const total = data.reduce(function (a, b) { return a + b.value; }, 0);

      let svg = '<svg class="chart-svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img">';
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#EDF1F7" stroke-width="' + stroke + '"/>';

      let offset = 0;
      data.forEach(function (d, i) {
        const frac = total ? d.value / total : 0;
        const len = frac * circ;
        const color = d.color || PALETTE[i % PALETTE.length];
        svg += '<circle class="donut-seg" data-tip="' + UI.esc(d.label + ': ' + d.value + ' (' + Math.round(frac * 100) + '%)') + '" ' +
          'cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" ' +
          'stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" ' +
          'transform="rotate(-90 ' + cx + ' ' + cy + ')" stroke-linecap="butt"/>';
        offset += len;
      });

      svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" style="font-size:30px;font-weight:800;fill:#0B1F3A;font-family:Inter,sans-serif">' + (opts.centerValue != null ? opts.centerValue : total) + '</text>';
      svg += '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" style="font-size:11.5px;fill:#64748B;font-family:Inter,sans-serif">' + UI.esc(opts.centerLabel || 'Total') + '</text>';
      svg += '</svg>';
      return svg;
    },

    /* Horizontal ranked bar list (as HTML, for "top departments"). */
    hbarList: function (items, opts) {
      opts = opts || {};
      if (!items.length) return UI.empty({ title: 'No data', message: 'No records match the current filters.' });
      const max = Math.max.apply(null, items.map(function (i) { return i.value; })) || 1;
      let html = '<div class="rank-list">';
      items.forEach(function (it, i) {
        const pct = Math.round((it.value / max) * 100);
        html += '<div class="rank-item">' +
          '<span class="rk-no">' + (i + 1) + '</span>' +
          '<div class="rk-main">' +
            '<div class="rk-name" title="' + UI.esc(it.label) + '">' + UI.esc(it.label) + '</div>' +
            '<div class="rk-bar"><span style="width:' + pct + '%"></span></div>' +
          '</div>' +
          '<span class="rk-val">' + it.value + '</span>' +
        '</div>';
      });
      html += '</div>';
      return html;
    },

    legend: function (items) {
      let html = '<div class="chart-legend">';
      items.forEach(function (it, i) {
        html += '<span class="lg"><i style="background:' + (it.color || PALETTE[i % PALETTE.length]) + '"></i>' + UI.esc(it.label) + '</span>';
      });
      return html + '</div>';
    },

    /* Chart card wrapper. */
    card: function (title, subtitle, bodyHTML, legendHTML) {
      return '<div class="chart-card">' +
        '<div class="chart-head"><div><h4>' + UI.esc(title) + '</h4>' +
          (subtitle ? '<div class="sub">' + UI.esc(subtitle) + '</div>' : '') +
        '</div></div>' +
        '<div class="chart-body">' + bodyHTML + '</div>' +
        (legendHTML || '') +
      '</div>';
    },

    /* After injecting chart HTML into the DOM, call this to bind tooltips. */
    bind: function (root) {
      (root || document).querySelectorAll('svg.chart-svg').forEach(function (svg) { bindHover(svg); });
    }
  };

  global.CC.Charts = Charts;
})(window);
