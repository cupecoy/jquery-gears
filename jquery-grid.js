(function ($) {
	"use strict";

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

		#columns_visibility = {};

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

		/**
		 *
		 * @param {DOMElement} elem
		 * @param {Object} settings
		 */

		constructor(elem, settings) {
			this.#elem = elem;
			this.#settings = $.extend(this.#settings, settings);

			this.#wrapper = this.#elem.parent().addClass('grid-wrapper');
			if (this.#settings.fixedHeader)
				this.#wrapper.addClass('grid-scroll');

			// elem.parent().prepend(this.#wrapper);
			// this.#wrapper.append(elem);

			this.#elem.addClass('grid');

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
				if (event.altKey)
					grid.#clearOrder();
				else {
					const name = $(this).attr('name');
					const order = grid.#getOrder();

					// if (!event.metaKey) grid.#clearOrder();

					grid.#setOrder(name, !order[name]);
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
					if (!['single', 'multiple'].includes(grid.#settings.selectionMode))
						return;

					const tr = $(this);

					if (grid.#settings.selectColumnIndex === null)
						grid.#toggleRow(tr);
					else if (grid.#settings.selectionMode == 'single')
						grid.#selectRow(tr);

					grid.#elem.trigger('grid:select', [tr]);
				})
				.on('click', 'input.grid-select', function (event) {
					const tr = $(this).closest('tr');

					grid.#toggleRow(tr);

					grid.#elem.trigger('grid:select', [tr]);

					event.stopPropagation();
				});
		}

		#initFoot() {
			this.#foot = this.#elem.find('tfoot');
		}

		#initColumns() {
			this.#columns_visibility = {};

			this.#columns = this.#elem.find('colgroup col').each((index, col) => {
				const name = $(col).attr('name');

				this.#columns_visibility[name] = true;

				const fmt = $(col).attr('format');
				const fn = function (v) {
					if (v && v.format)
						return v.format(fmt);

					const d = new Date().parseDbDate(v);
					if (d && d.format)
						return d.format(fmt);

					return v;
				};

				$(col).data('format', fmt ? fn : (index == this.#settings.selectColumnIndex ? formatSelect : formatAny)); //TODO formatSelect and formatAny
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

		#toggleRow(row) {
			if (row.hasClass('selected'))
				this.#unselectRow(row);
			else
				this.#selectRow(row);
		}

		#selectRow(row) {
			if (this.#settings.selectionMode == 'single') {
				const selectedRow = this.selectedRows();
				this.#unselectRow(selectedRow);
			}

			row.addClass('selected');

			if (this.#settings.selectColumnIndex !== null)
				$('td', row).eq(this.#settings.selectColumnIndex).find('input[type=checkbox]').prop('checked', true);
		}

		#unselectRow(row) {
			row.removeClass('selected');

			if (this.#settings.selectColumnIndex != null)
				$('td', row).eq(this.#settings.selectColumnIndex).find('input[type=checkbox]').prop('checked', false);
		}

		/**
		 * Create loader spinner
		 */
		#createLoader() {
			this.#elem.parent().append($('<div class="grid-loader"></div>').html('<div></div>'.repeat(12)));
		}

		/**
		 * Create blink alert message
		 * @param {*} message
		 */
		#createAlert(message) {
			this.#elem.parent().append($('<div class="grid-alert"></div>').html(message || this.#settings.defaultAlertMessage));
		}

		/**
		 * Create message
		 * @param {*} message
		 */
		#createMessage(message) {
			this.#elem.parent().append($('<div class="grid-message"></div>').html(message || this.#settings.defaultMessage));
		}


		/**
		 * Delete loader spinner from the grid
		 */
		#clearLoader() {
			this.#elem.parent().find('.grid-loader').remove();
		}

		/**
		 * Delete alert message from the grid
		 */
		#clearAlert() {
			this.#elem.parent().find('.grid-alert').remove();
		}

		/**
		 * Delete message from the grid
		 */
		#clearMessage() {
			this.#elem.parent().find('.grid-message').remove();
		}

		/**
		 * find row by [row-id] attribute
		 * @param {*} row_id -- specified in #settings.id
		 * @returns {jQuery} row
		 */
		#getRowById(row_id) {
			return this.#body.find(`tr[row-id="${row_id}"]`);
		}

		/**
		 * get column formatter
		 * @param {string} name -- column name
		 * @returns {function} formatter
		 */
		#getFormatter(name) {
			return this.#columns.filter(`[name="${name}"]`).data('format') ?? formatAny;
		}

		/**
		 * @param {Object} data
		 * @returns {jQuery}
		 */
		#createRow(data) {
			const row_id = get_value(data, this.#settings.id)

			const row = $(`<tr row-id="${row_id}"></tr>`).append(this.#columns.map((_, col) => {
				const name = $(col).attr('name');
				const isVisible = this.#columns_visibility[name];

				return this.#createCell(!isVisible).get();
			}));

			return this.#updateRow(row, data);
		}

		/**
		 * @param {jQuery} row
		 * @param {Object} data
		 * @param {Boolean} isNew
		 */
		#updateRow(row, data, isNew = true) {
			const row_data = $.extend(row.data('row'), data);
			row.data('row', row_data);

			this.#columns.each((_, col) => {
				const name = $(col).attr('name');

				if (data[name] !== undefined || this.#settings.functionalColumns[name] !== undefined || isNew) {
					const col_index = $(col).index();
					const cell_content = this.#createCellContent(row_data, name);

					row.find('td').eq(col_index).empty().append(cell_content);
				}
			});

			$.each(this.#settings.attr, function (name, field) {
				row.attr(name, get_value(data, field));
			});

			$.each(this.#settings.data, function (name, field) {
				row.data(name, get_value(data, field));
			});

			let parent, parent_id;
			if (data.parent && data.parent.length) {
				parent = data.parent;
				parent_id = parent.attr('row-id');
			}
			else if (data.parent_id) {
				parent_id = data.parent_id;
				parent = this.#body.find(`tr[parent-id="${parent_id}"]`);
			}

			if (this.#settings.expandColumnIndex !== null) {
				const level =  parent ? (parent.data('level') ?? 0) + 1 : 0;
				this.#createIndenter(row, level);
			}

			if (parent_id) {
				row.attr('parent-id', parent_id);

				row.toggleClass('grid-hidden', parent.length ? parent.hasClass('collapsed') : true);
			}

			return row;
		}

		#createCellContent(data, name) {
			return this.#getFormatter(name).call(data, get_value(data, name), name);
		}

		#createCell(hidden) {
			return $('<td></td>').toggleClass('grid-hidden', Boolean(hidden));
		}

		#normalizeData(data, ctx) {
			return $.map(!Array.isArray(data) ? [ data ] : data, row => (row instanceof $) ? row : this.#createRow($.extend(row, ctx)));
		}

		#normalizeContext(ctx) {
			if ($.isPlainObject(ctx)) {
				if (ctx.parent_id !== undefined)
					ctx.parent = this.#body.find(`tr[row-id="${ctx.parent_id}"]:first`);

				return ctx;
			}
			else if (ctx instanceof $)
				return { parent: ctx.filter('tr:first') };
			else if (ctx)
				return { parent: this.#body.find(`tr[row-id="${ctx}"]:first`) };
			else
				return { };
		}

		#insertRows(data, ctx, prepend = false) {
			if (data) {
				ctx = this.#normalizeContext(ctx);
				const rows = this.#normalizeData(data, ctx);

				let parent, siblings;
				if (ctx.parent !== undefined && ctx.parent.length) {
					parent = ctx.parent;
					siblings = this.#body.find(`[parent-id="${parent.attr('row-id')}"]`);
				}
				else
					siblings = this.#body.find('tr:not([parent-id])');


				if (parent && siblings.length) {
					let sibling;

					if (ctx.index !== undefined && ctx.index < siblings.length)
						sibling = siblings.eq(ctx.index);
					else if (prepend)
						sibling = siblings.first();
					else
						sibling = siblings.last();

					prepend ? sibling.before(rows) : sibling.after(rows);
				}
				else if (siblings.length) {
					if (ctx.index !== undefined && ctx.index < siblings.length)
						siblings.eq(ctx.index + +(!prepend)).before(rows)
					else if (prepend)
						this.#body.prepend(rows);
					else
						this.#body.append(rows);
				}
				else if (parent)
					parent.after(rows);
				else if (prepend)
					this.#body.prepend(rows);
				else
					this.#body.append(rows);

				this.#settings.expandColumnIndex !== undefined && $.each(rows, (_, row) => {
					if (row.is('[row-id]:not([parent-id])')) {
						row.hasClass('expanded') && this.#expandRow(row);
						row.hasClass('collapsed') && this.#collapseRow(row);
					}
				});

				this.#elem.trigger(prepend ? 'grid:prepend' : 'grid:append', [ rows ]);
			}
		}

		#getRowChildren(row) {
			const row_id = row.attr('row-id');
			return this.#body.find(`tr[parent-id="${row_id}"]`);
		}

		#expandRow(row) {
			row.addClass('expanded');
			row.removeClass('collapsed');

			const children = this.#getRowChildren(row);
			let count = children.length;

			children.each((_, child) => {
				$(child).removeClass('grid-hidden');

				if ($(child).hasClass('expanded'))
					count += this.#expandRow($(child));
			});

			return count;
		}

		#collapseRow(row) {
			row.addClass('collapsed');
			row.removeClass('expanded');

			const children = this.#getRowChildren(row);
			let count = children.length;

			children.each((_, child) => {
				$(child).addClass('grid-hidden');

				if ($(child).hasClass('expanded'))
					count += this.#collapseRow($(child));
			});

			this.#getRowChildren(row).addClass('grid-hidden');

			return count;
		}


		/**
		 * @param {jQuery} tr
		 * @param {Number} level
		 */
		#createIndenter(row, level) {
			const indenter = row.find('span.indenter');
			if (indenter.length === 0) {
				row.data('level', level)
					.css('--level', level)
					.find('td').eq(this.#settings.expandColumnIndex)
					.prepend('<span class="indenter"><a href="#">&nbsp;</a></span>');
			}
		}

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
			const column = this.#head.find(`*[name=${name}][order=true]`);

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

		rows(selector) {
			const rows = this.#body.find('tr');

			if (Array.isArray(selector))
				return rows.filter((index, elem) =>
					selector.some(item => {
						if (typeof item === 'number')
							return item == index;
						else if (typeof item === 'object')
							return item[this.#settings.id] == $(elem).attr('row-id');
						else
							return item == $(elem).attr('row-id');
					})
				);
			else if (typeof selector === 'number')
				return rows.eq(selector + 1);
			else if (selector !== undefined)
				return rows.filter(selector);

			return rows;
		}

		head() {
			return this.#head;
		}

		format(name, format) {
			$.each(Array.isArray(name) ? name : name.split(/[ ,]/), (_, name) => this.#columns.filter(`[name="${name}"]`).data('format', format ? format : formatAny));
		}

		setColumnHidden(name, hidden) {
			const col = this.#columns.filter(`[name="${name}"]`);
			hidden = Boolean(hidden);
			if (col.length && Boolean(col.data('grid-hidden')) !== hidden) {
				col.data('grid-hidden', hidden);

				if (this.#columns_visibility[name] !== undefined)
					this.#columns_visibility[name] = !hidden;

				const i = col.index() + 1;
				col.add(this.#head.find(`> tr > th:nth-child(${i}), > tr > td:nth-child(${i})`))
					.add(this.#body.find(`> tr > th:nth-child(${i}), > tr > td:nth-child(${i})`))
					.add(this.#foot.find(`> tr > th:nth-child(${i}), > tr > td:nth-child(${i})`))
					.toggleClass('grid-hidden', hidden);
			}
		}

		setColumnWidth(name, width) {
			this.#columns.filter(`[name="${name}"]`).css('width', width);
		}

		append(data, ctx) {
			this.#clearLoader();
			this.#clearAlert();
			this.#clearMessage();

			this.#insertRows(data, ctx);
		}

		prepend(data, ctx) {
			this.#clearLoader();
			this.#clearAlert();
			this.#clearMessage();

			this.#insertRows(data, ctx, true);
		}

		update(data) {
			this.#clearLoader();
			this.#clearAlert();
			this.#clearMessage();

			if (!Array.isArray(data) || data instanceof $)
				data = [ data ];

			$.each(data, (_, row_data) => {
				if (row_data instanceof $) {
					row_data.each((_, row) => {
						const row_id = $(row).attr('row-id');

						this.#getRowById(row_id).empty().append($(row).children())
					});
				}
				else if ($.isPlainObject(row_data)) {
					const row_id = row_data[this.#settings.id]
					const row = this.#getRowById(row_id);

					this.#updateRow(row, row_data, false);
				}
			});
		}

		remove(rows) {
			if (rows instanceof $)
				rows = rows.filter('tr');
			else
				rows = this.#getRowById(rows);

			this.#body.find(rows).each((_, row) => {
				row = $(row);
				this.remove(this.#getRowChildren(row));
				row.remove();
			});
		}

		index(row) {
			if (row instanceof $)
				row = row.filter('tr');
			else
				row = this.#getRowById(row);

			if (row.length) {
				const parent_id = row.attr('parent-id');
				let sibling;
				if (parent_id)
					sibling = this.#body.find(`tr[parent-id="${parent_id}"]`);
				else
					sibling = this.#body.find('tr:not([parent-id])');

				return sibling.index(row);
			}

			return -1;
		}

		clear() {
			this.#clearMessage();
			this.#clearLoader();

			this.#body.empty();

			this.#elem.trigger('grid:clear');
		}

		clearLookup() {
			this.#lookups.val(null, false).data('lookup-prev', '');
			this.#elem.trigger('grid:change');
		}


		/**
		 * @param {Object} template
		 * @returns {Object|null} lookup
		 */
		lookup(template) {
			const lookup = this.#lookups.get().reduce((acc, tr) => {
				const name = $(tr).attr('name');
				const value = $(tr).val();
				if (value || value === 0)
					acc[name] = value;

				return acc;
			}, $.extend({}, template))


			const order = this.#getOrder();
			if (!$.isEmptyObject(order)) lookup['grid:order'] = order;

			return $.isEmptyObject(lookup) ? null : lookup;
		}

		/**
		 * @param {*} selection
		 * @param {*} action
		 *
		 */
		selection(selection, action) {
			if (selection === undefined)
				return this.selectedRows().map((_, row) => $(row).attr('row-id')).get();
			else {
				let rows;
				if (action === undefined)
					rows = this.selectedRows().each((_, row) => this.#unselectRow($(row)));
				else {
					rows = this.rows();
					if (selection instanceof $)
						rows = rows.filter(selection);
					else if (Array.isArray(selection))
						selection = selection.map(String)
					
					rows = rows.filter((_, row) => selection.includes($(row).attr('row-id')));

					if (action == 'remove')
						rows.each((_, row) => this.#unselectRow($(row)));
					else if (action == 'add')
						rows.each((_, row) => this.#selectRow($(row)));
				}

				rows.length && this.#elem.trigger('grid:select', [ rows ]);
			}
		}

		selectedRows() {
			return this.#body.find('tr.selected');
		}

		ids(selector) {
			return this.rows(selector).map((_, row) => $(row).attr('row-id'));
		}

		size() {
			return this.rows().length;
		}

		parent(row) {
			return this.#getRowById(row.attr('parent-id'))
		}

		loader() {
			this.#clearLoader();
			this.#clearAlert();
			this.#clearMessage();

			this.#createLoader();
		}

		alert(message) {
			this.#clearLoader();
			this.#clearAlert();
			this.#clearMessage();

			this.#createAlert(message);
		}

		message(message) {
			this.#clearLoader();
			this.#clearAlert();
			this.#clearMessage();

			this.#createMessage(message);
		}

		toggle(row) {
			if (row.hasClass('expanded'))
				this.collapse(row);
			else if (row.hasClass('collapsed'))
				this.expand(row);
		}

		expand(row) {
			row.hasClass('collapsed') && this.#elem.trigger('grid:expand', [ row, this.#expandRow(row) ]);
		}

		collapse(row) {
			row.hasClass('expanded') && this.#elem.trigger('grid:collapse', [ row, this.#collapseRow(row) ]);
		}
	}

	$.fn.grid = function (method) {
		let rval, args = Array.prototype.slice.call(arguments, 1);

		let error = false;
		$(this).each(function () {
			const t = $(this);
			if ($.isPlainObject(method) || !method) {
				t.data('grid', new Grid(t, method));
				return true;
			}
			else if (t.data('grid') === undefined)
				t.data('grid', new Grid(t, {}));

			if (Grid.prototype[method]) {
				const grid = t.data('grid');
				rval = Grid.prototype[method].apply(grid, args);
				return rval === undefined;
			}
			else {
				error = true;
				return false;
			}
		});

		if (error)
			return $.error("Method " + method + " doesn't exist in jquery-grid");
		else
			return rval === undefined ? this : rval;
	};
})(jQuery);