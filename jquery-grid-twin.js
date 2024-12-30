(function ($) {
	
	const formatSelect = function (value) {
		return $('<input type="checkbox" class="grid-select" />').attr('value', value);
	};
	
	const formatAny = function (value) {
		return value || '';
	};
	
	const get_value = function (data, name) {
		let a = name.split('.');
		let o = data;
		for (let n = a.shift(); n; n = a.shift())
			o = o && typeof o === 'object' ? o[n] : null;
	
		return o;
	};
	
	class Grid {
		#wrapper = null;
		#elem = null;
	
		#head = null;
		#body = null;
		#foot = null;
	
		#columns = null;
	
		#lookups = null;
	
		#settings = {
			id: 'id',
			attr: {},
			data: {},
			fixedHeader: true,
			selectionMode: '', // 'single', 'miltiple
			selectColumnIndex: null,
			expandColumnIndex: null,
			defaultAlertMessage: 'Search yielded no results',
			defaultMessage: 'Please, specify search criteria in the fields above',
			functionalColumns: [],
	
			orderIconAsk: '&darr;',
			orderIconDesc: '&uarr;',
		};
	
		#formatters = {}
	
		/**
		 * 
		 * @param {DOMElement} elem 
		 * @param {Object} settings 
		 */
	
		constructor(elem, settings) {
			this.#settings = $.extend(this.#settings, settings);
	
			this.#elem = elem;
	
			this.#initHead();
			this.#initBody();
			this.#initFoot();
			this.#initColumns();
			this.#initLookups();
		}
	
		#initHead() {
			const grid = this;
	
			grid.#head = grid.#elem.find('thead');
	
			grid.#head.find('*[name][order="true"]').on('click', function (event) {
				if (event.altKey || !event.metaKey) {
					grid._clearOrder();
				}
				else {
					const name = $(this).attr('name');
					const order = grid._getOrder();
	
					grid._setOrder(name, !order[name]);
				}
	
				grid.#elem.trigger('grid:change');
			});
		}
	
		#initBody() {
			const grid = this;
	
			grid.#body = grid.#elem.find('tbody')
				.on('click', '.indenter', function (event) {
					grid.toggle($(this).closest('tr'));
	
					event.stopPropagation();
				})
				.on('click', 'tr', function () {
					const tr = $(this);
	
					grid.toggleRow(tr);
	
					grid.#elem.trigger('grid:select', [tr]);
				})
				.on('click', 'input.grid-select', function (event) {
					const tr = $(this).closest('tr');
	
					grid.toggleRow(tr);
	
					grid.#elem.trigger('grid:select', [tr]);
	
					event.stopPropagation();
				});
		}
	
		#initFoot() {
			this.#foot = this.#elem.find('tfoot');
		}
	
		#initColumns() {
			const grid = this;
	
			grid.#columns = grid.#elem.find('colgroup col')
				.each(function (index) {
					const col = $(this);
					const fmt = col.attr('format');
	
					const fn = function (v) {
						if (v && v.format)
							return v.format(fmt);
	
						const d = new Date().parseDbDate(v);
						if (d && d.format)
							return d.format(fmt);
	
						return v;
					};
	
					col.data('format', fmt ? fn : (index == grid.#settings.selectColumnIndex ? formatSelect : formatAny)); //TODO formatSelect and formatAny
				});
		}
	
		#initLookups() {
			const grid = this;
	
			grid.#lookups = grid.#head.find('input[name]')
				.on('focus', function () {
					const self = $(this);
					setTimeout(function () { self.select(); });
				})
				.on('keydown', function (event) {
					const self = $(this);
					if (event.which === $.ui.keyCode.ENTER) {
						if (self.data('lookup-prev') != self.val()) {
							self.data('lookup-prev', self.val());
	
							event.preventDefault();
							event.stopPropagation();
	
							self.blur().select(); // will fire 'change' event if needed
						}
					}
					else if (event.which === $.ui.keyCode.ESCAPE) {
						event.preventDefault();
						event.stopPropagation();
	
						grid.#lookups.val('', false).data('lookup-prev', '');
	
						self.trigger('change').blur();
	
						grid.#elem.trigger('grid:escape');
					}
				})
				.on('change', function () {
					grid.#elem.trigger('grid:change');
				});
		}
		
		#formatValue(value, name, data) {
			if (this.#formatters[name] !== undefined && typeof this.#formatters[name] === 'function')
				return this.#formatters[name].call(data, value, name);
	
			return formatAny(value);
		}
	
		/**
		 * @param {Object} data
		 * @returns {jQuery}
		 */
		#createRow(data) {
			const grid = this;
	
			const row_id = get_value(data, grid.#settings.id)
	
			const row = $(`<tr row-id="${row_id}"></tr>`)
				.data('row', data)
				.append(grid.#columns.map(function (_, col) {
					const name = $(col).attr('name');
					const value = get_value(data, name);
	
					return grid.#createCell(value, name, data);
				}));
	
			if (data.parent && data.parent.length)
				row.attr('parent-id', data.parent.attr('row-id'));
			else if (data.parent_id)
				row.attr('parent-id', data.parent_id);
	
			$.each(grid.#settings.attr, function (name, field) {
				row.attr(name, get_value(data, field));
			});
	
			$.each(grid.#settings.data, function (name, field) {
				row.data(name, get_value(data, field));
			});
	
			return row;
		};
	
		#createCell(value, name, row_data) {
			return $('<td></td>').append(this.#formatValue(value, name, row_data));
		}
	
		/**
		 * @param {jQuery} rows
		 */
		#updateRows(rows) {
			const levels = {};
			const collapsed = {};
	
			rows.each(function () {
				const tr = $(this);
	
				const parent_id = tr.attr('parent-id');
	
				let level = 0;
				if (parent_id) {
					if (levels[parent_id] === undefined) {
						var parent = this.#body.find(`tr[row-id=${parent_id}]`);
						levels[parent_id] = this._getLevel(parent);
						collapsed[parent_id] = parent.is('.collapsed');
					}
	
					level = levels[parent_id] + 1;
	
					if (collapsed[parent_id])
						tr.hide();
				}
	
				levels[tr.attr('row-id')] = level;
	
				this.#updateIndenter(tr, level);
	
				if (tr.is('.collapsed')) {

				}
					// this.#hideChildren(tr);
			});
		};
	
		/**
		 * @param {jQuery} tr
		 * @param {Number} level
		 */
		#updateIndenter(tr, level) {
			if (this.#settings.expandColumnIndex !== null) {
				const indenter = tr.find('span.indenter');
				if (indenter.length === 0) {
					tr.find('td').eq(this.#settings.expandColumnIndex)
						.prepend(`<span class="indenter" style="--level: ${level};"><a href="#">&nbsp;</a></span>`);
				}
	
				//TODO need to add css for identer
				// indenter.css('padding-left', (8 * level) + 'px');
			}
		};
	
		/**
		 * @param {jQuery} tr
		 * @returns {Number}
		 */
		#getLevel(tr) {
			const parent_id = tr.attr('parent-id');
			if (parent_id === undefined)
				return 0;
	
			return this.#getLevel(this.#body.find(`tr[row-id=${parent_id}]`)) + 1;
		}
	
	
		/**
		 * 
		 */
	
		#getOrder() {
			return this.#head.find(':has(span.grid-order)').get().reduce(function (acc, el) {
				if ($(el).data('order') !== undefined) {
					const name = $(el).attr('name');
					acc[name] = $(el).data('order');
				}
	
				return acc;
			}, {});
		}
	
		#setOrder(name, asc) {
			this.#clearOrder();
			const column = this.#head.find(`*[name=${name}][order=true]`).first();
	
			column.append($(`<span class="grid-order">${asc ? this.#settings.orderIconAsk : this.#settings.orderIconDesc}</span>`));
			column.data('order', asc);
		}
	
		#clearOrder() {
			this.#head.find(':has(span.grid-order)').each(function () {
				$(this).find('span.grid-order').remove();
				delete $(this).data().order;
			});
		}
	
		/**
		 * 
		 * @returns 
		 */
	
		getSelectedRows() {
			return this.#body.find('tr.selected');
		}
	
		toggleRow(row) {
			if (row.hasClass('selected'))
				this.unselectRow(row);
			else
				this.selectRow(row);
		}
	
		selectRow(row) {
			if (this.#settings.selectionMode == 'single') {
				const selectedRow = this.getSelectedRows();
				this.unselectRow(selectedRow);
			}
	
			row.addClass('selected');
	
			if (this.#settings.selectColumnIndex !== null)
				$('td', row).eq(this.#settings.selectColumnIndex).find('input[type=checkbox]').prop('checked', true);
		}
	
		unselectRow(row) {
			row.removeClass('selected');
	
			if (this.#settings.selectColumnIndex != null)
				$('td', row).eq(this.#settings.selectColumnIndex).find('input[type=checkbox]').prop('checked', false);
		}
	
		appendRow(data) {
			this.#body.append(this.#createRow(data));
		}
	
		prependRow(data) {
			this.#body.prepend(this.#createRow(data));
		}
	}

	$.fn.grid = function () {
		const e = $(this);
		const m = arguments[0];
		const p = Array.prototype.slice.call(arguments, 1);

		let rval, args = Array.prototype.slice.call(arguments, 1);
		e.each(function () {
			const t = $(this);
			if ($.isPlainObject(m) || !m || t.data('grid') === undefined) { // init grid
				t.data('grid', new Grid(t, m));
			}
			else {
				rval = 1;
			}
		});

		// var options;

		// if ($.isPlainObject(method) || !method) {
		// 	options = method;
		// 	method = 'init';
		// }

		// if (Grid.prototype[method]) {
		// 	// var rval, args = Array.prototype.slice.call(arguments, 1);

		// 	this.each(function() {
		// 		var elem = $(this);
		// 		var grid = elem.data('grid');
		// 		if (grid === undefined) {
		// 			grid = new Grid(elem, options);
		// 			elem.data('grid', grid);
		// 		}

		// 		rval = Grid.prototype[method].apply(grid, args);
		// 		return rval === undefined;
		// 	});

		// 	return rval === undefined ? this : rval;
		// }

		// return $.error("Method " + method + " doesn't exist in jquery-grid");
	};
})(jQuery);