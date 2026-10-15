/* ============================================================
   CampusCred — js/components/ui.js
   Reusable UI primitives: formatting, badges, toasts, modals,
   confirm dialogs, empty/loading states, table renderer.
   ============================================================ */
(function (global) {
  'use strict';
  const icon = global.CC.icon;

  const UI = {
    /* ---------- formatting ---------- */
    esc: function (v) {
      if (v == null) return '';
      return String(v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    fmtDate: function (iso) {
      if (!iso) return '—';
      const parts = String(iso).split('-');
      if (parts.length !== 3) return iso;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    fmtDateShort: function (iso) {
      if (!iso) return '—';
      const parts = String(iso).split('-');
      if (parts.length !== 3) return iso;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    },

    fmtSize: function (bytes) {
      if (!bytes) return '0 KB';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    timeAgo: function (iso) {
      if (!iso) return '';
      const then = new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso).getTime();
      const diff = Math.max(0, Date.now() - then);
      const days = Math.floor(diff / 86400000);
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 30) return days + ' days ago';
      if (days < 365) return Math.floor(days / 30) + ' mo ago';
      return Math.floor(days / 365) + ' yr ago';
    },

    initials: function (name) {
      if (!name) return '?';
      const parts = String(name).trim().split(/\s+/);
      return ((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '');
    },

    avatar: function (name, color, size, avatarUrl) {
      const cls = size === 'xs' ? 'avatar xs' : size === 'sm' ? 'avatar sm' : size === 'lg' ? 'avatar lg' : size === 'xl' ? 'avatar xl' : 'avatar';
      let url = avatarUrl;
      if (!url && global.CC && global.CC.Store && global.CC.Store.db) {
        try {
          const sess = global.CC.Store.getSession ? global.CC.Store.getSession() : null;
          if (sess && (sess.name === name || sess.fullName === name || sess.userId === name || sess.email === name)) {
            url = sess.avatar || sess.profilePictureUrl;
          }
          if (!url && global.CC.Store.db.students) {
            const st = global.CC.Store.db.students.find(function (s) {
              return s.name === name || s.id === name || s.email === name;
            });
            if (st) url = st.avatar || st.profilePictureUrl;
          }
          if (!url && global.CC.Store.db.users) {
            const u = global.CC.Store.db.users.find(function (x) {
              return x.name === name || x.uid === name || x.email === name;
            });
            if (u) url = u.avatar || u.profilePictureUrl;
          }
        } catch (e) { /* ignore */ }
      }
      if (url) {
        return '<span class="' + cls + ' avatar-img" aria-hidden="true"><img src="' + UI.esc(url) + '" alt="' + UI.esc(name || '') + '" onerror="this.parentElement.classList.remove(\'avatar-img\');this.parentElement.innerHTML=\'' + UI.esc(UI.initials(name)) + '\';" /></span>';
      }
      return '<span class="' + cls + '" data-c="' + ((color || 1) % 6 + 1) + '" aria-hidden="true">' + UI.esc(UI.initials(name)) + '</span>';
    },

    /* ---------- badges ---------- */
    statusBadge: function (status) {
      const map = {
        verified: ['badge-verified', 'Verified'],
        pending: ['badge-pending', 'Pending'],
        rejected: ['badge-rejected', 'Rejected']
      };
      const m = map[status] || ['badge-neutral', status || 'Unknown'];
      return '<span class="badge ' + m[0] + '"><span class="dot"></span>' + m[1] + '</span>';
    },

    categoryBadge: function (category) {
      return '<span class="badge badge-royal">' + UI.esc(category) + '</span>';
    },

    /* ---------- toasts ---------- */
    toastStack: null,
    ensureToastStack: function () {
      if (!UI.toastStack || !document.body.contains(UI.toastStack)) {
        let el = document.querySelector('.toast-stack');
        if (!el) {
          el = document.createElement('div');
          el.className = 'toast-stack';
          el.setAttribute('role', 'status');
          el.setAttribute('aria-live', 'polite');
          document.body.appendChild(el);
        }
        UI.toastStack = el;
      }
      return UI.toastStack;
    },

    toast: function (type, title, message) {
      const stack = UI.ensureToastStack();
      const icons = { success: 'checkCircle', error: 'xCircle', info: 'info', warning: 'alert' };
      const el = document.createElement('div');
      el.className = 'toast ' + (type || 'info');
      el.innerHTML =
        '<span class="t-icon">' + icon(icons[type] || 'info', 15) + '</span>' +
        '<div class="t-body">' +
          '<div class="t-title">' + UI.esc(title) + '</div>' +
          (message ? '<div class="t-msg">' + UI.esc(message) + '</div>' : '') +
        '</div>' +
        '<button class="t-close" type="button" aria-label="Dismiss">' + icon('x', 14) + '</button>';
      stack.appendChild(el);

      const close = function () {
        el.classList.add('leaving');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
      };
      el.querySelector('.t-close').addEventListener('click', close);
      setTimeout(close, 4200);
      return el;
    },
    success: function (t, m) { return UI.toast('success', t, m); },
    error: function (t, m) { return UI.toast('error', t, m); },
    info: function (t, m) { return UI.toast('info', t, m); },
    warning: function (t, m) { return UI.toast('warning', t, m); },

    /* ---------- modals ---------- */
    openModal: function (opts) {
      opts = opts || {};
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const sizeCls = opts.size === 'lg' ? ' modal-lg' : opts.size === 'xl' ? ' modal-xl' : '';
      backdrop.innerHTML =
        '<div class="modal' + sizeCls + '" role="dialog" aria-modal="true" aria-label="' + UI.esc(opts.title || 'Dialog') + '">' +
          '<div class="modal-head">' +
            '<div><h3>' + UI.esc(opts.title || '') + '</h3>' +
              (opts.subtitle ? '<div class="sub">' + UI.esc(opts.subtitle) + '</div>' : '') +
            '</div>' +
            '<button class="icon-btn bare" type="button" data-close aria-label="Close">' + icon('x', 18) + '</button>' +
          '</div>' +
          '<div class="modal-body">' + (opts.body || '') + '</div>' +
          (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
        '</div>';
      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';

      const close = function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        if (opts.onClose) opts.onClose();
      };
      const onKey = function (e) { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop && opts.dismissible !== false) close();
      });
      backdrop.querySelectorAll('[data-close]').forEach(function (b) {
        b.addEventListener('click', close);
      });

      const firstInput = backdrop.querySelector('input, textarea, select');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 60);

      return { el: backdrop, close: close };
    },

    /* Confirmation dialog returning a promise. */
    confirm: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        const tone = opts.tone || 'primary';
        const confirmCls = tone === 'danger' ? 'btn-danger' : tone === 'success' ? 'btn-success' : 'btn-primary';
        const m = UI.openModal({
          title: opts.title || 'Are you sure?',
          body:
            '<div style="display:flex;gap:14px;align-items:flex-start">' +
              '<span class="tone-' + (tone === 'danger' ? 'red' : tone === 'success' ? 'green' : 'royal') + '" style="width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none">' +
                icon(tone === 'danger' ? 'alert' : tone === 'success' ? 'checkCircle' : 'info', 22) +
              '</span>' +
              '<div style="font-size:14px;color:var(--text-700);line-height:1.6">' + (opts.message || '') + '</div>' +
            '</div>',
          footer:
            '<button class="btn btn-outline" type="button" data-decline>' + UI.esc(opts.declineText || 'Cancel') + '</button>' +
            '<button class="btn ' + confirmCls + '" type="button" data-accept>' + UI.esc(opts.acceptText || 'Confirm') + '</button>',
          onClose: function () { resolve(false); }
        });
        m.el.querySelector('[data-accept]').addEventListener('click', function () {
          resolve(true); // resolve before close: onClose would otherwise settle as false first
          m.el.querySelector('[data-close]').click();
        });
        m.el.querySelector('[data-decline]').addEventListener('click', function () {
          m.el.querySelector('[data-close]').click();
        });
      });
    },

    /* Interactive image cropper modal with zoom, pan, rotate, aspect ratio presets & live preview */
    openImageCropperModal: function (fileOrSrc, onConfirm) {
      function startWithSrc(src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          setupCropper(img);
        };
        img.onerror = function () {
          UI.error('Image Error', 'Failed to read the selected image file. Please try another image.');
        };
        img.src = src;
      }

      if (!fileOrSrc) return;
      if (typeof fileOrSrc === 'string') {
        startWithSrc(fileOrSrc);
      } else if (fileOrSrc instanceof Blob || (fileOrSrc && fileOrSrc.name)) {
        const reader = new FileReader();
        reader.onload = function (e) {
          startWithSrc(e.target.result);
        };
        reader.onerror = function () {
          UI.error('File Error', 'Could not read the image file.');
        };
        reader.readAsDataURL(fileOrSrc);
      }

      function setupCropper(img) {
        const bodyHtml =
          '<div class="cropper-modal-layout">' +
            '<div class="cropper-stage">' +
              '<div class="cropper-canvas-wrap" id="cropCanvasWrap">' +
                '<canvas id="cropMainCanvas" width="480" height="350"></canvas>' +
              '</div>' +
              '<div class="cropper-toolbar">' +
                '<div class="cropper-tool-group">' +
                  '<span style="font-size:12px;color:#94A3B8;font-weight:600">Zoom:</span>' +
                  '<button class="btn btn-xs btn-outline" type="button" id="cropZoomOut" title="Zoom Out" style="color:#F1F5F9;border-color:#334155">' + icon('zoomOut', 14) + '</button>' +
                  '<input type="range" class="crop-slider" id="cropZoomSlider" min="0.2" max="3.5" step="0.05" value="1" style="width:110px" />' +
                  '<button class="btn btn-xs btn-outline" type="button" id="cropZoomIn" title="Zoom In" style="color:#F1F5F9;border-color:#334155">' + icon('zoomIn', 14) + '</button>' +
                '</div>' +
                '<div class="cropper-tool-group">' +
                  '<button class="btn btn-xs btn-outline" type="button" id="cropRotateCw" title="Rotate 90° Clockwise" style="color:#F1F5F9;border-color:#334155">' + icon('rotateCw', 14) + ' Rotate</button>' +
                  '<button class="btn btn-xs btn-outline" type="button" id="cropReset" title="Reset View" style="color:#F1F5F9;border-color:#334155">' + icon('refresh', 13) + ' Reset</button>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:8px">' +
                '<div class="cropper-tool-group">' +
                  '<span style="font-size:11.5px;color:#94A3B8;font-weight:600">Aspect Ratio:</span>' +
                  '<button class="btn btn-xs btn-primary" type="button" data-crop-aspect="1:1">1:1 Square</button>' +
                  '<button class="btn btn-xs btn-outline" type="button" data-crop-aspect="4:5" style="color:#F1F5F9;border-color:#334155">4:5 Portrait</button>' +
                  '<button class="btn btn-xs btn-outline" type="button" data-crop-aspect="free" style="color:#F1F5F9;border-color:#334155">Custom</button>' +
                '</div>' +
                '<div style="font-size:11px;color:#94A3B8;display:flex;align-items:center;gap:4px">' +
                  icon('crop', 12) + ' Drag handles to resize • Drag inside to reposition' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="cropper-sidebar">' +
              '<div style="font-weight:700;font-size:13px;color:var(--text-900);margin-bottom:12px">Live Previews</div>' +
              '<div class="preview-box">' +
                '<canvas id="cropPreviewCircle" width="110" height="110" style="width:110px;height:110px;border-radius:50%;border:2px solid var(--royal-400);background:#1E293B;box-shadow:0 4px 14px rgba(0,0,0,0.12)"></canvas>' +
                '<span class="preview-lbl">Profile Header</span>' +
              '</div>' +
              '<div class="preview-box">' +
                '<canvas id="cropPreviewSquare" width="68" height="68" style="width:68px;height:68px;border-radius:12px;border:1.5px solid var(--border);background:#1E293B"></canvas>' +
                '<span class="preview-lbl">Card Avatar</span>' +
              '</div>' +
              '<div class="preview-box" style="margin-bottom:0">' +
                '<canvas id="cropPreviewSmall" width="36" height="36" style="width:36px;height:36px;border-radius:50%;border:1.5px solid var(--border);background:#1E293B"></canvas>' +
                '<span class="preview-lbl">Navbar Icon</span>' +
              '</div>' +
            '</div>' +
          '</div>';

        const modal = UI.openModal({
          title: 'Crop & Adjust Profile Picture',
          subtitle: 'Adjust zoom, position, and dimensions to personalize your student profile picture.',
          size: 'lg',
          body: bodyHtml,
          footer:
            '<button class="btn btn-outline" type="button" data-close>Cancel</button>' +
            '<button class="btn btn-primary" type="button" id="cropApplyBtn">' + icon('check', 15) + 'Apply &amp; Save Picture</button>'
        });

        const root = modal.el;
        const mainCanvas = root.querySelector('#cropMainCanvas');
        const ctx = mainCanvas.getContext('2d');
        const prevCircle = root.querySelector('#cropPreviewCircle').getContext('2d');
        const prevSquare = root.querySelector('#cropPreviewSquare').getContext('2d');
        const prevSmall = root.querySelector('#cropPreviewSmall').getContext('2d');

        const CW = mainCanvas.width;
        const CH = mainCanvas.height;

        let aspectMode = '1:1'; // '1:1', '4:5', 'free'
        let rotation = 0; // 0, 90, 180, 270
        let zoom = 1.0;
        let baseScale = 1.0;
        let imgX = CW / 2;
        let imgY = CH / 2;

        // Crop Box inside Main Canvas
        let crop = { x: 130, y: 65, w: 220, h: 220 };

        function initScale() {
          const fitW = (CW - 60) / img.width;
          const fitH = (CH - 60) / img.height;
          baseScale = Math.min(fitW, fitH, 1.0);
          zoom = 1.0;
          imgX = CW / 2;
          imgY = CH / 2;
          updateCropAspect();
        }

        function updateCropAspect() {
          const maxDim = Math.min(CW - 40, CH - 40);
          if (aspectMode === '1:1') {
            const size = Math.min(220, maxDim);
            crop.w = size;
            crop.h = size;
          } else if (aspectMode === '4:5') {
            const h = Math.min(240, maxDim);
            crop.h = h;
            crop.w = Math.round(h * 0.8);
          }
          crop.x = Math.round((CW - crop.w) / 2);
          crop.y = Math.round((CH - crop.h) / 2);
          draw();
        }

        function draw() {
          ctx.clearRect(0, 0, CW, CH);

          // Draw Image with transform
          ctx.save();
          ctx.translate(imgX, imgY);
          ctx.rotate((rotation * Math.PI) / 180);
          const currentScale = baseScale * zoom;
          ctx.scale(currentScale, currentScale);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ctx.restore();

          // Dark overlay outside crop box
          ctx.save();
          ctx.fillStyle = 'rgba(11, 15, 25, 0.72)';
          // Top
          ctx.fillRect(0, 0, CW, crop.y);
          // Bottom
          ctx.fillRect(0, crop.y + crop.h, CW, CH - (crop.y + crop.h));
          // Left
          ctx.fillRect(0, crop.y, crop.x, crop.h);
          // Right
          ctx.fillRect(crop.x + crop.w, crop.y, CW - (crop.x + crop.w), crop.h);

          // Crop boundary border
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2;
          ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);

          // Rule of thirds grid lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          // vertical
          ctx.moveTo(crop.x + crop.w / 3, crop.y);
          ctx.lineTo(crop.x + crop.w / 3, crop.y + crop.h);
          ctx.moveTo(crop.x + (crop.w * 2) / 3, crop.y);
          ctx.lineTo(crop.x + (crop.w * 2) / 3, crop.y + crop.h);
          // horizontal
          ctx.moveTo(crop.x, crop.y + crop.h / 3);
          ctx.lineTo(crop.x + crop.w, crop.y + crop.h / 3);
          ctx.moveTo(crop.x, crop.y + (crop.h * 2) / 3);
          ctx.lineTo(crop.x + crop.w, crop.y + (crop.h * 2) / 3);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw resize corner handles
          const handleSize = 9;
          const handles = [
            [crop.x, crop.y],
            [crop.x + crop.w, crop.y],
            [crop.x + crop.w, crop.y + crop.h],
            [crop.x, crop.y + crop.h],
            [crop.x + crop.w / 2, crop.y],
            [crop.x + crop.w, crop.y + crop.h / 2],
            [crop.x + crop.w / 2, crop.y + crop.h],
            [crop.x, crop.y + crop.h / 2]
          ];
          handles.forEach(function (h) {
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#2563EB';
            ctx.lineWidth = 2;
            ctx.fillRect(h[0] - handleSize / 2, h[1] - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(h[0] - handleSize / 2, h[1] - handleSize / 2, handleSize, handleSize);
          });
          ctx.restore();

          // Render live previews
          renderPreviews();
        }

        function renderPreviews() {
          if (crop.w <= 0 || crop.h <= 0) return;

          function renderInto(targetCtx, w, h, isCircle, radius) {
            targetCtx.clearRect(0, 0, w, h);
            targetCtx.save();
            if (isCircle) {
              targetCtx.beginPath();
              targetCtx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
              targetCtx.clip();
            } else if (radius) {
              targetCtx.beginPath();
              targetCtx.moveTo(radius, 0);
              targetCtx.lineTo(w - radius, 0);
              targetCtx.quadraticCurveTo(w, 0, w, radius);
              targetCtx.lineTo(w, h - radius);
              targetCtx.quadraticCurveTo(w, h, w - radius, h);
              targetCtx.lineTo(radius, h);
              targetCtx.quadraticCurveTo(0, h, 0, h - radius);
              targetCtx.lineTo(0, radius);
              targetCtx.quadraticCurveTo(0, 0, radius, 0);
              targetCtx.closePath();
              targetCtx.clip();
            }

            // Draw cropped segment of main canvas (without overlay)
            // By re-drawing the transformed image shifted by crop.x, crop.y scaled to w, h
            const ratioX = w / crop.w;
            const ratioY = h / crop.h;
            targetCtx.scale(ratioX, ratioY);
            targetCtx.translate(-crop.x, -crop.y);

            targetCtx.translate(imgX, imgY);
            targetCtx.rotate((rotation * Math.PI) / 180);
            const currentScale = baseScale * zoom;
            targetCtx.scale(currentScale, currentScale);
            targetCtx.drawImage(img, -img.width / 2, -img.height / 2);

            targetCtx.restore();
          }

          renderInto(prevCircle, 110, 110, true, 0);
          renderInto(prevSquare, 68, 68, false, 12);
          renderInto(prevSmall, 36, 36, true, 0);
        }

        // Pointer / Touch interactions on Canvas
        let dragging = null; // 'crop-move', 'pan-img', or handle name ('nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w')
        let dragStartX = 0;
        let dragStartY = 0;
        let startCrop = { x: 0, y: 0, w: 0, h: 0 };
        let startImgX = 0;
        let startImgY = 0;

        function getCanvasPoint(e) {
          const rect = mainCanvas.getBoundingClientRect();
          const scaleX = CW / rect.width;
          const scaleY = CH / rect.height;
          const clientX = e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;
          return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
          };
        }

        function hitTestHandle(pt) {
          const tol = 12;
          if (Math.hypot(pt.x - crop.x, pt.y - crop.y) < tol) return 'nw';
          if (Math.hypot(pt.x - (crop.x + crop.w), pt.y - crop.y) < tol) return 'ne';
          if (Math.hypot(pt.x - (crop.x + crop.w), pt.y - (crop.y + crop.h)) < tol) return 'se';
          if (Math.hypot(pt.x - crop.x, pt.y - (crop.y + crop.h)) < tol) return 'sw';
          if (Math.abs(pt.y - crop.y) < tol && pt.x >= crop.x && pt.x <= crop.x + crop.w) return 'n';
          if (Math.abs(pt.x - (crop.x + crop.w)) < tol && pt.y >= crop.y && pt.y <= crop.y + crop.h) return 'e';
          if (Math.abs(pt.y - (crop.y + crop.h)) < tol && pt.x >= crop.x && pt.x <= crop.x + crop.w) return 's';
          if (Math.abs(pt.x - crop.x) < tol && pt.y >= crop.y && pt.y <= crop.y + crop.h) return 'w';
          return null;
        }

        function onPointerDown(e) {
          e.preventDefault();
          const pt = getCanvasPoint(e);
          dragStartX = pt.x;
          dragStartY = pt.y;
          startCrop = Object.assign({}, crop);
          startImgX = imgX;
          startImgY = imgY;

          const handle = hitTestHandle(pt);
          if (handle) {
            dragging = handle;
          } else if (pt.x >= crop.x && pt.x <= crop.x + crop.w && pt.y >= crop.y && pt.y <= crop.y + crop.h) {
            dragging = 'crop-move';
          } else {
            dragging = 'pan-img';
          }
        }

        function onPointerMove(e) {
          const pt = getCanvasPoint(e);
          if (!dragging) {
            const h = hitTestHandle(pt);
            if (h === 'nw' || h === 'se') mainCanvas.style.cursor = 'nwse-resize';
            else if (h === 'ne' || h === 'sw') mainCanvas.style.cursor = 'nesw-resize';
            else if (h === 'n' || h === 's') mainCanvas.style.cursor = 'ns-resize';
            else if (h === 'e' || h === 'w') mainCanvas.style.cursor = 'ew-resize';
            else if (pt.x >= crop.x && pt.x <= crop.x + crop.w && pt.y >= crop.y && pt.y <= crop.y + crop.h) mainCanvas.style.cursor = 'move';
            else mainCanvas.style.cursor = 'grab';
            return;
          }

          e.preventDefault();
          const dx = pt.x - dragStartX;
          const dy = pt.y - dragStartY;

          if (dragging === 'crop-move') {
            crop.x = Math.max(0, Math.min(CW - crop.w, startCrop.x + dx));
            crop.y = Math.max(0, Math.min(CH - crop.h, startCrop.y + dy));
          } else if (dragging === 'pan-img') {
            imgX = startImgX + dx;
            imgY = startImgY + dy;
          } else {
            // Resize handles
            let newX = startCrop.x;
            let newY = startCrop.y;
            let newW = startCrop.w;
            let newH = startCrop.h;

            if (dragging.indexOf('e') !== -1) newW = Math.max(50, startCrop.w + dx);
            if (dragging.indexOf('s') !== -1) newH = Math.max(50, startCrop.h + dy);
            if (dragging.indexOf('w') !== -1) {
              const deltaW = Math.min(startCrop.w - 50, dx);
              newX = startCrop.x + deltaW;
              newW = startCrop.w - deltaW;
            }
            if (dragging.indexOf('n') !== -1) {
              const deltaH = Math.min(startCrop.h - 50, dy);
              newY = startCrop.y + deltaH;
              newH = startCrop.h - deltaH;
            }

            // Aspect ratio constraint
            if (aspectMode === '1:1') {
              const size = Math.max(50, Math.min(newW, newH));
              newW = size;
              newH = size;
            } else if (aspectMode === '4:5') {
              newH = Math.max(60, Math.round(newW * 1.25));
            }

            // Keep in bounds
            if (newX + newW <= CW && newY + newH <= CH && newX >= 0 && newY >= 0) {
              crop.x = newX;
              crop.y = newY;
              crop.w = newW;
              crop.h = newH;
            }
          }

          draw();
        }

        function onPointerUp() {
          dragging = null;
        }

        mainCanvas.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        mainCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);

        // Mouse Wheel Zoom
        mainCanvas.addEventListener('wheel', function (e) {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.08 : -0.08;
          zoom = Math.max(0.2, Math.min(3.5, zoom + delta));
          const slider = root.querySelector('#cropZoomSlider');
          if (slider) slider.value = zoom.toFixed(2);
          draw();
        }, { passive: false });

        // Zoom Controls
        const zoomSlider = root.querySelector('#cropZoomSlider');
        zoomSlider.addEventListener('input', function () {
          zoom = parseFloat(zoomSlider.value);
          draw();
        });
        root.querySelector('#cropZoomIn').addEventListener('click', function () {
          zoom = Math.min(3.5, zoom + 0.15);
          zoomSlider.value = zoom.toFixed(2);
          draw();
        });
        root.querySelector('#cropZoomOut').addEventListener('click', function () {
          zoom = Math.max(0.2, zoom - 0.15);
          zoomSlider.value = zoom.toFixed(2);
          draw();
        });

        // Rotate & Reset Controls
        root.querySelector('#cropRotateCw').addEventListener('click', function () {
          rotation = (rotation + 90) % 360;
          draw();
        });
        root.querySelector('#cropReset').addEventListener('click', function () {
          initScale();
          zoomSlider.value = '1.0';
          draw();
        });

        // Aspect Ratio Preset Buttons
        root.querySelectorAll('[data-crop-aspect]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            root.querySelectorAll('[data-crop-aspect]').forEach(function (b) {
              b.className = 'btn btn-xs btn-outline';
              b.style.color = '#F1F5F9';
              b.style.borderColor = '#334155';
            });
            btn.className = 'btn btn-xs btn-primary';
            btn.style.color = '';
            btn.style.borderColor = '';
            aspectMode = btn.getAttribute('data-crop-aspect');
            updateCropAspect();
          });
        });

        // Confirm / Apply Button
        root.querySelector('#cropApplyBtn').addEventListener('click', function () {
          // Offscreen high-resolution render of cropped box
          const outW = aspectMode === '4:5' ? 440 : 512;
          const outH = aspectMode === '4:5' ? 550 : 512;
          const off = document.createElement('canvas');
          off.width = outW;
          off.height = outH;
          const oCtx = off.getContext('2d');
          oCtx.imageSmoothingEnabled = true;
          oCtx.imageSmoothingQuality = 'high';

          const ratioX = outW / crop.w;
          const ratioY = outH / crop.h;
          oCtx.scale(ratioX, ratioY);
          oCtx.translate(-crop.x, -crop.y);

          oCtx.translate(imgX, imgY);
          oCtx.rotate((rotation * Math.PI) / 180);
          const currentScale = baseScale * zoom;
          oCtx.scale(currentScale, currentScale);
          oCtx.drawImage(img, -img.width / 2, -img.height / 2);

          const croppedDataUrl = off.toDataURL('image/jpeg', 0.92);

          // Clean up window listeners
          window.removeEventListener('mousemove', onPointerMove);
          window.removeEventListener('mouseup', onPointerUp);
          window.removeEventListener('touchmove', onPointerMove);
          window.removeEventListener('touchend', onPointerUp);

          modal.close();
          if (onConfirm) onConfirm(croppedDataUrl);
        });

        // Initial setup
        initScale();
        draw();
      }
    },

    /* ---------- states ---------- */
    loading: function (label) {
      return '<div class="loading-state"><span class="spinner"></span><span>' + UI.esc(label || 'Loading…') + '</span></div>';
    },

    skeletonRows: function (n) {
      let out = '<div style="padding:6px 0">';
      for (let i = 0; i < (n || 5); i++) out += '<div class="skeleton skeleton-row" style="width:' + (70 + (i % 3) * 10) + '%"></div>';
      return out + '</div>';
    },

    empty: function (opts) {
      opts = opts || {};
      return '<div class="empty-state">' +
        '<div class="es-icon">' + icon(opts.icon || 'inbox', 30) + '</div>' +
        '<h4>' + UI.esc(opts.title || 'Nothing here yet') + '</h4>' +
        '<p>' + UI.esc(opts.message || '') + '</p>' +
        (opts.action ? '<button class="btn btn-primary" type="button" data-empty-action>' + opts.action + '</button>' : '') +
      '</div>';
    },

    /* ---------- table renderer ---------- */
    /* columns: [{ key, label, className, render(row) -> html }] */
    table: function (columns, rows, opts) {
      opts = opts || {};
      if (!rows.length) {
        return '<div class="table-wrap">' + UI.empty(opts.empty || {}) + '</div>';
      }
      let html = '<div class="table-wrap"><table class="table"><thead><tr>';
      columns.forEach(function (c) {
        html += '<th class="' + (c.className || '') + '">' + UI.esc(c.label) + '</th>';
      });
      html += '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr' + (opts.rowAttrs ? ' ' + opts.rowAttrs(r) : '') + '>';
        columns.forEach(function (c) {
          const content = c.render ? c.render(r) : UI.esc(r[c.key]);
          html += '<td class="' + (c.className || '') + '">' + content + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      return html;
    },

    /* ---------- misc ---------- */
    setHTML: function (el, html) {
      if (el) el.innerHTML = html;
      return el;
    },

    delegate: function (root, eventName, selector, handler) {
      root.addEventListener(eventName, function (e) {
        const target = e.target.closest(selector);
        if (target && root.contains(target)) handler(e, target);
      });
    },

    copyText: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return UI.fallbackCopy(text); });
      }
      return Promise.resolve(UI.fallbackCopy(text));
    },

    fallbackCopy: function (text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    },

    /* Debounce helper used by search inputs. */
    debounce: function (fn, wait) {
      let t;
      return function () {
        const args = arguments, ctx = this;
        clearTimeout(t);
        t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
      };
    }
  };

  global.CC.UI = UI;
})(window);
