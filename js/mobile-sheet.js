export default class MobileSheet {
    constructor(buttons) {
        this.buttons = buttons;
        this.active = false;
        this.snap = 'compact';
        this.drag = null;
        this.dialogParent = null;
        this.dialogEl = null;
        this.origParents = {};
        this.controlPositions = {};
        this.menuOpen = false;

        this.sheet = document.getElementById('mobile-sheet');
        this.handle = document.getElementById('mobile-sheet-handle');
        this.scroll = document.getElementById('mobile-sheet-scroll');
        this.slotInfo = document.getElementById('mobile-sheet-slot-info');
        this.slotOptions = document.getElementById('mobile-sheet-slot-options');
        this.slotButtons = document.getElementById('mobile-sheet-slot-buttons');
        this.dialog = document.getElementById('mobile-sheet-dialog');
        this.crosshair = document.getElementById('mobile-crosshair');
        this.helpTouch = document.getElementById('mobile-help-touch');
        this.toolbar = document.getElementById('mobile-toolbar');
        this.toolsRow = document.getElementById('mobile-tools-row');
        this.overflowPanel = document.getElementById('mobile-overflow-panel');
        this.overflowPrimary = document.getElementById('mobile-overflow-primary');
        this.burger = document.getElementById('mobile-burger');
        this.mapEl = document.getElementById('mapid');

        if (!this.sheet || buttons.embedding) return;

        L.DomEvent.disableClickPropagation(this.sheet);
        L.DomEvent.disableScrollPropagation(this.sheet);

        this.bindTools();
        this.bindHandle();
        this.patchDialogs();

        window.addEventListener('resize', () => this.sync());
        this.buttons.map.on('move zoom', () => this.positionCrosshair());
        this.sync();
    }

    sync() {
        const want = this.buttons.isMobile() && !this.buttons.embedding;
        if (want && !this.active) this.activate();
        else if (!want && this.active) this.deactivate();
        else if (this.active) {
            this.layoutToolbar();
            this.fitToContent(false);
        }
        this.updateEditChrome();
        this.syncPrimaryButtons();
    }

    activate() {
        this.active = true;
        document.body.classList.add('mobile-ui');
        this.sheet.hidden = false;
        this.sheet.setAttribute('aria-hidden', 'false');

        this.reparent(this.buttons.trace_info_content, this.slotInfo, 'info');
        this.reparent(this.buttons.editing_options, this.slotOptions, 'options');
        const buttonsEl = document.getElementById('buttons');
        this.reparent(buttonsEl, this.slotButtons, 'buttons');

        if (this.buttons.toolbar && this.buttons.toolbar.getContainer) {
            this.buttons.toolbar.getContainer().style.display = 'none';
        }
        if (this.buttons.buttonbar && this.buttons.buttonbar.getContainer) {
            this.buttons.buttonbar.getContainer().style.display = 'none';
        }
        if (this.buttons.trace_info && this.buttons.trace_info.getContainer) {
            this.buttons.trace_info.getContainer().style.display = 'none';
        }

        this.moveMapControls(true);

        if (this.buttons.elevation_input && !this.buttons.elevation_input.checked) {
            this.buttons.elevation_input.click();
        }
        this.buttons.trace_info_grid.classList.remove('minimized');
        this.buttons.trace_info_grid.classList.add('maximized');
        this.setMenuOpen(false);
        this.layoutToolbar();
        this.fitToContent(false);
        this.updateEditChrome();
        this.syncPrimaryButtons();
        requestAnimationFrame(() => {
            this.buttons.setElevationProfileWidth();
            this.layoutToolbar();
            this.fitToContent(false);
            this.styleMapControlIcons();
        });
    }

    deactivate() {
        this.closeDialog({ silent: true });
        this.hideCrosshair();
        this.setMenuOpen(false);
        if (this.slotInfo) this.slotInfo.hidden = false;
        if (this.slotOptions) this.slotOptions.hidden = false;
        this.gatherAllToolsToRow();
        this.active = false;
        document.body.classList.remove('mobile-ui');
        this.sheet.hidden = true;
        this.sheet.setAttribute('aria-hidden', 'true');
        this.sheet.style.height = '';
        document.documentElement.style.removeProperty('--mobile-sheet-h');
        if (this.mapEl) this.mapEl.style.height = '';

        this.restore('info');
        this.restore('options');
        this.restore('buttons');
        this.moveMapControls(false);

        if (this.buttons.toolbar && this.buttons.toolbar.getContainer) {
            this.buttons.toolbar.getContainer().style.display = '';
        }
        if (this.buttons.buttonbar && this.buttons.buttonbar.getContainer) {
            this.buttons.buttonbar.getContainer().style.display = '';
        }
        if (this.buttons.trace_info && this.buttons.trace_info.getContainer) {
            this.buttons.trace_info.getContainer().style.display = '';
        }

        this.buttons.setElevationProfileWidth();
        this.buttons.map.invalidateSize({ animate: false });
    }

    moveMapControls(toMobile) {
        const pairs = [
            ['geocoderControl', 'topleft', 'topright'],
            ['controlLayers', 'topleft', 'topright']
        ];
        for (const [key, mobilePos, desktopPos] of pairs) {
            const ctrl = this.buttons[key];
            if (!ctrl || !ctrl.setPosition) continue;
            if (toMobile) {
                if (!this.controlPositions[key]) {
                    this.controlPositions[key] = ctrl.getPosition ? ctrl.getPosition() : desktopPos;
                }
                ctrl.setPosition(mobilePos);
            } else {
                ctrl.setPosition(this.controlPositions[key] || desktopPos);
            }
        }
        if (toMobile) {
            this.styleMapControlIcons();
            requestAnimationFrame(() => this.styleMapControlIcons());
        } else {
            const search = document.querySelector('.leaflet-control-geocoder-icon');
            if (search) search.classList.remove('fas', 'fa-search', 'custom-button');
        }
    }

    styleMapControlIcons() {
        const search = document.querySelector('.leaflet-control-geocoder-icon');
        if (search) {
            search.removeAttribute('href');
            search.classList.add('fas', 'fa-search', 'custom-button');
        }
        this.restoreLayersToggleIcon();
    }

    restoreLayersToggleIcon() {
        const ctrl = this.buttons.controlLayers;
        const toggle = document.querySelector('.leaflet-control-layers-toggle');
        if (!toggle) return;
        toggle.removeAttribute('href');
        toggle.classList.add('fas', 'fa-layer-group', 'custom-button');
        this.bindLayersToggle(ctrl, toggle);
    }

    bindLayersToggle(ctrl, toggle) {
        if (!ctrl || !toggle || toggle._mobileToggleBound) return;
        toggle._mobileToggleBound = true;
        L.DomEvent.on(toggle, 'click', (e) => {
            if (ctrl._isExpanded && ctrl._isExpanded()) {
                L.DomEvent.stop(e);
                ctrl.collapse();
            }
        });
    }

    reparent(el, slot, key) {
        if (!el || !slot) return;
        if (!this.origParents[key]) {
            this.origParents[key] = { parent: el.parentNode, next: el.nextSibling };
        }
        slot.appendChild(el);
    }

    restore(key) {
        const meta = this.origParents[key];
        if (!meta || !meta.parent) return;
        const el = key === 'info' ? this.buttons.trace_info_content
            : key === 'options' ? this.buttons.editing_options
            : document.getElementById('buttons');
        if (!el) return;
        if (meta.next && meta.next.parentNode === meta.parent) {
            meta.parent.insertBefore(el, meta.next);
        } else {
            meta.parent.appendChild(el);
        }
    }

    toolButtons() {
        return Array.from(this.sheet.querySelectorAll('#mobile-tools-row > [data-action], #mobile-overflow-primary > [data-action]'));
    }

    gatherAllToolsToRow() {
        if (!this.toolsRow || !this.overflowPrimary) return;
        const overflowBtns = Array.from(this.overflowPrimary.querySelectorAll('[data-action]'));
        for (const btn of overflowBtns) this.toolsRow.appendChild(btn);
    }

    /** Fit visible action buttons into one row; overflow goes behind the burger. */
    layoutToolbar() {
        if (!this.toolbar || !this.toolsRow || !this.burger || !this.overflowPrimary) return;

        // Collect every action button (row + overflow), keep only currently visible ones in play
        this.gatherAllToolsToRow();
        const buttons = Array.from(this.toolsRow.querySelectorAll(':scope > [data-action]'));

        // Park all in overflow so the row is empty and we can measure its real free width
        for (const btn of buttons) {
            this.overflowPrimary.appendChild(btn);
        }
        this.overflowPrimary.hidden = false;

        // Force reflow, then measure the empty row's client width (space left of burger)
        void this.toolbar.offsetWidth;
        const available = Math.floor(this.toolsRow.getBoundingClientRect().width);
        if (available <= 0) {
            // Toolbar not laid out yet; try again next frame
            requestAnimationFrame(() => {
                if (this.active) this.layoutToolbar();
            });
            return;
        }

        let full = false;
        for (const btn of buttons) {
            // Skip buttons that should not be shown (edit-only when not editing, etc.)
            if (btn.hidden) {
                this.overflowPrimary.appendChild(btn);
                continue;
            }
            if (full) {
                this.overflowPrimary.appendChild(btn);
                continue;
            }
            this.toolsRow.appendChild(btn);
            // If this button caused overflow, move it (and the rest) to the burger menu
            if (this.toolsRow.scrollWidth > this.toolsRow.clientWidth + 1) {
                this.overflowPrimary.appendChild(btn);
                full = true;
            }
        }

        const overflowVisible = Array.from(this.overflowPrimary.children)
            .filter((el) => el.matches && el.matches('[data-action]') && !el.hidden);
        this.overflowPrimary.hidden = overflowVisible.length === 0;
        this.burger.hidden = false;
        if (this.menuOpen) this.overflowPanel.hidden = false;
    }

    setMenuOpen(open) {
        this.menuOpen = !!open;
        if (this.overflowPanel) this.overflowPanel.hidden = !this.menuOpen;
        if (this.burger) this.burger.classList.toggle('open', this.menuOpen);
        // Focus the tool menu: hide stats/profile while the menu is open
        if (this.slotInfo) this.slotInfo.hidden = this.menuOpen;
        if (this.slotOptions) this.slotOptions.hidden = this.menuOpen;
        this.updateExpandableChrome();
    }

    moreToolsOpen() {
        return this.menuOpen;
    }

    contentHeight() {
        const handleH = this.handle && !this.handle.hidden && this.sheet.classList.contains('mobile-sheet-expandable')
            ? this.handle.offsetHeight : 0;
        const style = window.getComputedStyle(this.scroll);
        const pad = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
        let contentH = 0;
        for (const child of this.scroll.children) {
            if (child.hidden) continue;
            const cs = window.getComputedStyle(child);
            if (cs.display === 'none') continue;
            contentH += child.offsetHeight;
            contentH += (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
        }
        const measured = Math.ceil(handleH + contentH + pad);
        const hardCap = Math.round(window.innerHeight * 0.9);
        return Math.max(48, Math.min(hardCap, measured));
    }

    collapsedHeight() {
        return this.contentHeight();
    }

    updateExpandableChrome() {
        // Expand only for dialogs / help that may need more vertical room
        const expandable = !!this.dialogEl || (this.helpTouch && !this.helpTouch.hidden);
        this.sheet.classList.toggle('mobile-sheet-expandable', expandable);
        if (this.handle) this.handle.hidden = !expandable;
    }

    fitToContent(animate = true) {
        this.snap = 'compact';
        this.updateExpandableChrome();
        const h = this.contentHeight();
        if (animate) this.sheet.classList.add('mobile-sheet-anim');
        else this.sheet.classList.remove('mobile-sheet-anim');
        this.setSheetHeight(h);
        this.sheet.dataset.snap = 'compact';
        requestAnimationFrame(() => {
            const again = this.contentHeight();
            if (Math.abs(again - h) > 2) this.setSheetHeight(again);
            this.buttons.map.invalidateSize({ animate: false });
            this.positionCrosshair();
        });
    }

    expandTo(height, animate = true) {
        const maxH = this.contentHeight();
        const minH = this.menuOpen ? Math.min(this.collapsedHeight(), maxH) : maxH;
        const h = Math.min(maxH, Math.max(minH, height));
        if (animate) this.sheet.classList.add('mobile-sheet-anim');
        else this.sheet.classList.remove('mobile-sheet-anim');
        this.setSheetHeight(h);
        this.snap = h >= maxH - 8 ? 'full' : (h <= minH + 8 ? 'compact' : 'mid');
        this.sheet.dataset.snap = this.snap;
        requestAnimationFrame(() => {
            this.buttons.map.invalidateSize({ animate: false });
            this.buttons.setElevationProfileWidth();
            this.positionCrosshair();
        });
    }

    setSheetHeight(h) {
        this.sheet.style.height = h + 'px';
        document.documentElement.style.setProperty('--mobile-sheet-h', h + 'px');
        if (this.mapEl) this.mapEl.style.height = `calc(100% - ${h}px)`;
    }

    bindHandle() {
        const onStart = (clientY) => {
            if (!this.sheet.classList.contains('mobile-sheet-expandable')) return;
            this.sheet.classList.remove('mobile-sheet-anim');
            this.drag = {
                startY: clientY,
                startH: this.sheet.getBoundingClientRect().height,
                maxH: this.contentHeight(),
                minH: Math.min(this.collapsedHeight(), this.contentHeight())
            };
        };
        const onMove = (clientY) => {
            if (!this.drag) return;
            const dy = this.drag.startY - clientY;
            const h = Math.min(this.drag.maxH, Math.max(this.drag.minH, this.drag.startH + dy));
            this.setSheetHeight(h);
        };
        const onEnd = () => {
            if (!this.drag) return;
            const h = this.sheet.getBoundingClientRect().height;
            const mid = (this.drag.minH + this.drag.maxH) / 2;
            this.drag = null;
            if (h >= mid) this.expandTo(this.contentHeight(), true);
            else this.expandTo(this.collapsedHeight(), true);
        };

        this.handle.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            onStart(e.touches[0].clientY);
        }, { passive: true });
        this.handle.addEventListener('touchmove', (e) => {
            if (!this.drag || e.touches.length !== 1) return;
            e.preventDefault();
            onMove(e.touches[0].clientY);
        }, { passive: false });
        this.handle.addEventListener('touchend', onEnd);
        this.handle.addEventListener('touchcancel', onEnd);

        this.handle.addEventListener('mousedown', (e) => {
            if (!this.sheet.classList.contains('mobile-sheet-expandable')) return;
            e.preventDefault();
            onStart(e.clientY);
            const move = (ev) => onMove(ev.clientY);
            const up = () => {
                window.removeEventListener('mousemove', move);
                window.removeEventListener('mouseup', up);
                onEnd();
            };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        });
    }

    bindTools() {
        const onAction = (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn || btn.disabled) return;
            const action = btn.dataset.action;
            const b = this.buttons;
            if (action === 'burger') {
                this.setMenuOpen(!this.menuOpen);
                requestAnimationFrame(() => {
                    this.layoutToolbar();
                    this.fitToContent(true);
                });
                return;
            }
            if (action === 'load') b.load.click();
            else if (action === 'draw') b.draw.click();
            else if (action === 'export') b.export.click();
            else if (action === 'clear') b.clear.click();
            else if (action === 'edit') b.edit.click();
            else if (action === 'undo') b.undo.click();
            else if (action === 'redo') b.redo.click();
            else if (action === 'done') b.edit.click();
            else if (action === 'add') this.addAtCrosshair();
            else if (action === 'help') b.help.click();
        };

        this.toolbar.addEventListener('click', onAction);
        this.overflowPanel.addEventListener('click', onAction);

        const helpClose = document.getElementById('mobile-help-close');
        if (helpClose) {
            helpClose.addEventListener('click', () => {
                this.helpTouch.hidden = true;
                if (this.buttons.window_open === this.buttons.help_window) {
                    this.buttons.window_open = null;
                }
                this.updateExpandableChrome();
                this.fitToContent(true);
            });
        }
    }

    syncPrimaryButtons() {
        const set = (action, disabled) => {
            this.sheet.querySelectorAll(`[data-action="${action}"]`).forEach((el) => {
                el.disabled = !!disabled;
                el.classList.toggle('unselected', !!disabled);
            });
        };
        const b = this.buttons;
        const canExport = b.total && !b.total.hasFocus && b.total.focusOn >= 0
            && b.total.traces[b.total.focusOn]
            && !b.export.classList.contains('unselected');
        set('export', !canExport);
        set('undo', b.undo.classList.contains('unselected') || b.undo.classList.contains('no-click2'));
        set('redo', b.redo.classList.contains('unselected') || b.redo.classList.contains('no-click2'));

        const editing = this.isEditing();
        this.sheet.querySelectorAll('.mobile-edit-only').forEach((el) => {
            el.hidden = !editing;
        });
        this.sheet.querySelectorAll('[data-action="edit"]').forEach((el) => { el.hidden = editing; });
        this.sheet.querySelectorAll('[data-action="draw"]').forEach((el) => { el.hidden = editing; });

        if (this.active) this.layoutToolbar();
    }

    isEditing() {
        const total = this.buttons.total;
        if (!total || total.hasFocus) return false;
        const trace = total.traces[total.focusOn];
        return !!(trace && trace.isEdited);
    }

    updateEditChrome() {
        if (!this.active) {
            this.hideCrosshair();
            return;
        }
        const editing = this.isEditing();
        if (editing) {
            this.showCrosshair();
            if (this.buttons.editing_options) {
                this.buttons.editing_options.style.display = 'block';
            }
        } else {
            this.hideCrosshair();
        }
        this.syncPrimaryButtons();
        if (this._wasEditing !== editing) {
            this._wasEditing = editing;
            requestAnimationFrame(() => {
                this.layoutToolbar();
                this.fitToContent(false);
            });
        }
    }

    showCrosshair() {
        if (!this.crosshair) return;
        this.crosshair.hidden = false;
        this.crosshair.setAttribute('aria-hidden', 'false');
        this.positionCrosshair();
    }

    hideCrosshair() {
        if (!this.crosshair) return;
        this.crosshair.hidden = true;
        this.crosshair.setAttribute('aria-hidden', 'true');
    }

    positionCrosshair() {
        if (!this.crosshair || this.crosshair.hidden || !this.mapEl) return;
        const mapRect = this.mapEl.getBoundingClientRect();
        this.crosshair.style.left = (mapRect.left + mapRect.width / 2) + 'px';
        this.crosshair.style.top = (mapRect.top + mapRect.height / 2) + 'px';
    }

    getCrosshairLatLng() {
        const map = this.buttons.map;
        const size = map.getSize();
        return map.containerPointToLatLng(L.point(size.x / 2, size.y / 2));
    }

    addAtCrosshair() {
        const total = this.buttons.total;
        if (!total || total.hasFocus) return;
        const trace = total.traces[total.focusOn];
        if (!trace || !trace.isEdited) return;
        const latlng = this.getCrosshairLatLng();
        if (trace.drawing || !trace.getPoints().length) {
            trace.addEndPoint(latlng.lat, latlng.lng);
            return;
        }
        const layerPoint = this.buttons.map.latLngToLayerPoint(latlng);
        let best = null;
        const segments = trace.getSegments();
        for (let i = 0; i < segments.length; i++) {
            const layer = segments[i];
            if (!layer.closestLayerPoint) continue;
            const pt = layer.closestLayerPoint(layerPoint);
            if (!pt) continue;
            if (best == null || pt.distance < best.distance) {
                best = { layer, pt, distance: pt.distance };
            }
        }
        if (best && best.distance < 40) {
            const insertLl = this.buttons.map.layerPointToLatLng(best.pt);
            const marker = trace.newEditMarker(insertLl, best.layer);
            trace.insertEditMarker(marker, insertLl);
        } else {
            trace.addEndPoint(latlng.lat, latlng.lng);
        }
    }

    patchDialogs() {
        const b = this.buttons;
        const pairs = [
            [b.load_window, b.load_content],
            [b.export_window, b.export_content],
            [b.clear_window, b.clear_content],
            [b.help_window, null],
            [b.delete_window, b.delete_content],
            [b.load_error_window, b.load_error_content]
        ];
        for (const [win, content] of pairs) {
            if (!win) continue;
            const originalShow = win.show.bind(win);
            const originalHide = win.hide.bind(win);
            win.show = (...args) => {
                if (this.active) {
                    if (win === b.help_window) {
                        this.openHelp();
                        b.window_open = win;
                        return win;
                    }
                    this.openDialog(content);
                    b.window_open = win;
                    return win;
                }
                return originalShow(...args);
            };
            win.hide = (...args) => {
                if (this.active && this.dialogEl === content) this.closeDialog();
                if (this.active && win === b.help_window) {
                    this.helpTouch.hidden = true;
                }
                return originalHide(...args);
            };
        }
    }

    openDialog(contentEl) {
        if (!contentEl) return;
        this.helpTouch.hidden = true;
        if (this.dialogEl && this.dialogEl !== contentEl) this.closeDialog({ silent: true });
        this.dialogParent = { parent: contentEl.parentNode, next: contentEl.nextSibling, display: contentEl.style.display };
        this.dialogEl = contentEl;
        this.dialog.hidden = false;
        this.dialog.appendChild(contentEl);
        contentEl.style.display = '';
        this.updateExpandableChrome();
        requestAnimationFrame(() => this.fitToContent(true));
    }

    closeDialog(options = {}) {
        if (!this.dialogEl) return;
        const el = this.dialogEl;
        const meta = this.dialogParent;
        if (meta && meta.parent) {
            if (meta.next && meta.next.parentNode === meta.parent) meta.parent.insertBefore(el, meta.next);
            else meta.parent.appendChild(el);
            if (meta.display !== undefined) el.style.display = meta.display;
        }
        this.dialog.hidden = true;
        this.dialogEl = null;
        this.dialogParent = null;
        this.updateExpandableChrome();
        if (!options.silent && this.active) this.fitToContent(true);
    }

    openHelp() {
        this.closeDialog({ silent: true });
        this.helpTouch.hidden = false;
        this.updateExpandableChrome();
        requestAnimationFrame(() => this.fitToContent(true));
    }
}
