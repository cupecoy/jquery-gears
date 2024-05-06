(function($) {
	"use strict";
	
	var scrollbarWidth_ = null;
	
	/**
	 * Returns platform independent scrollbar width (cached).
	 */
	var getScrollbarWidth = function() {
		if (scrollbarWidth_ === null) {
			// Create the measurement node
			var scrollDiv = document.createElement("div");
			scrollDiv.className = "grid-scrollbar-measure";
			document.body.appendChild(scrollDiv);

			// Get the scrollbar width
			scrollbarWidth_ = scrollDiv.offsetWidth - scrollDiv.clientWidth;

			// Delete the DIV 
			document.body.removeChild(scrollDiv);
		}
		
		return scrollbarWidth_;
	};

	/*
	 * Default cell value formatter.
	 * 
	 * @param {Object} value
	 * @returns {String} text representation of the value
	 */
	var formatAny = function(value) {
		return value || '';
	};

	/**
	 * Default select column formatter.
	 * 
	 * @param {String} value
	 * @returns {jQuery} checkbox
	 */
	var formatSelect = function(value) {
		return $('<input type="checkbox" class="grid-select" />').attr('value', value);
	};
	
	/*
	 * Evaluates callback in correct UI context even for hidden/invisible element.
	 * 
	 * @param {jQuery} obj jQuery object
	 * @param {Function} callback
	 * @returns callback's result
	 */
	var actual = function(obj, callback) {
		var loop = function(elem) {
			if (elem != document.body) {
				if (elem.style.display == 'none') {
					var visibility = elem.style.visibility;
					elem.style.visibility = 'collapse';
					elem.style.display = 'block';

					var result = loop.call(this, elem.parentNode);

					elem.style.display = 'none';
					elem.style.visibility = visibility;

					return result;
				}
				else
					return loop.call(this, elem.parentNode);
			}
			else
				return callback.call(this, obj);
		};
		
		return loop.call(this, $(obj).get(0));
	};

	const in_array = function(value, array) {
		return array.filter(function(item) { return item == value; }).length > 0;
	};

	const get_value = function(row, name) {
		let a = name.split('.');
		let o = row;
		for (let n = a.shift(); n; n = a.shift())
			o = o && typeof o === 'object' ? o[n] : null;
		return o;
	};

	function Grid(elem, options) {
		var grid = this;

		this.settings = $.extend({
			id: 'id',
			attr: { },
			data: { },
			fixedHeader: true,
			selectionMode: '', // 'single', 'miltiple
			selectColumnIndex: null,
			expandColumnIndex: null,
			defaultAlertMessage: 'Search yielded no results',
			defaultMessage: 'Please, specify search criteria in the fields above',
			functionalColumns: []
		}, options);

		this.elem = elem;
		this.elem.addClass('grid');

		this.head = elem.find('thead');
		if (this.settings.fixedHeader) {
			var spacer = $('<col />');
			var colgroup = elem.find('colgroup').clone().append(spacer);

			// create fixed header table and get its height
			var height = actual($('<table></table>')
				.attr('cellspacing', elem.attr('cellspacing'))
				.attr('class', elem.attr('class'))
				.attr('style', elem.attr('style'))
				.css({ position: 'absolute', top: 0 })
				.appendTo(elem.parent())
				.append(colgroup)
				.append(this.head),
				function(obj) { return obj.height(); });

			// create grid scrolling area
			elem.wrap('<div class="grid-scroll" style="top: ' + height + 'px;"></div>');

			// make TH count correspond to COL count
			var tr = this.head.find('tr:first');
			while (tr.children().length < colgroup.children().length)
				tr.append('<th></th>');

			// OS X hack
			if (navigator.platform.match(/mac/i)) {
				// set spacer width to 0px (scrollbar takes no space)
				spacer.css('width', '0px');
				elem.parent().css('overflow-y', 'auto');
			}
			else {
				// update spacer width (for possible scrollbar)
				spacer.css('width', getScrollbarWidth() + 'px');
			}

		}

		this.head.find('*[name][order="true"]')
			.css('cursor', 'pointer')
			.on('click', function(event) {
				if (!event.altKey) {
					var order = grid._getOrder();
					var name = $(this).attr('name');

					if (!event.metaKey)
						grid._clearOrder();

					grid._setOrder(name, !order[name]);
				}
				else
					grid._clearOrder();

				grid.elem.trigger('grid:change');
			});

		this.columns = elem.find('colgroup col')
			.each(function(index) {
				var col = $(this);
				var fmt = col.attr('format');
				col.data('format', fmt ? function (v) {
											if (v && v.format)
												return v.format(fmt);
											var d = new Date().parseDbDate(v);
											if (d && d.format)
												return d.format(fmt);
											return v;
										} : index == grid.settings.selectColumnIndex ? formatSelect : formatAny);
			});

		this.lookups = this.head.find('input[name]')
			.on('focus', function() {
				var $this = $(this);
				setTimeout(function() { $this.select(); });
			})
			.on('keydown', function(event) {
				if (event.which === $.ui.keyCode.ENTER) {
					var $this = $(this);
			
					if ($this.data('lookup-prev') != $this.val()) {
						$this.data('lookup-prev', $this.val());

						event.preventDefault();
						event.stopPropagation();

						$this.blur().select(); // will fire 'change' event if needed
					}
				}
				else if (event.which === $.ui.keyCode.ESCAPE) {
					event.preventDefault();
					event.stopPropagation();

					grid.lookups.val('', false).data('lookup-prev', '');
					
					$(this).trigger('change').blur();

					grid.elem.trigger('grid:escape');
				}
			})
			.on('change', function() {
				grid.elem.trigger('grid:change');
			});

		this.body = elem.find('tbody')
			.on('click', '.indenter', function(event) {
				grid.toggle($(this).closest('tr'));
				event.stopPropagation();
			})
			.on('click', 'tr', function() {
				var tr = $(this);
				
				if (grid.settings.selectColumnIndex === null) {
					switch (grid.settings.selectionMode) {
					case 'single':
						grid.body.find('.selected').not(tr).removeClass('selected');

					case 'multiple':
						tr.toggleClass('selected');

						grid.elem.trigger('grid:select', [ tr ]);
					}
				}
				else if(grid.settings.selectionMode == 'single') {
					grid.body.find('.selected').not(tr).removeClass('selected').each(function() {
						$('td', this).eq(grid.settings.selectColumnIndex).find('input').prop('checked', false);
					});

					tr.addClass('selected').each(function() {
						$('td', this).eq(grid.settings.selectColumnIndex).find('input').prop('checked', true);
					});

					grid.elem.trigger('grid:select', [ tr ]);
				}
			})
//			.on('click', 'tr td:eq(' + this.settings.selectColumnIndex + ') input', function() {
			.on('click', 'input.grid-select', function(event) {
				var tr = $(this).closest('tr');

				switch (grid.settings.selectionMode) {
				case 'single':
					grid.body.find('.selected').not(tr).removeClass('selected').each(function() {
						$('td', this).eq(grid.settings.selectColumnIndex).find('input').prop('checked', false);
					});

				case 'multiple':
					if (this.checked)
						tr.addClass('selected');
					else
						tr.removeClass('selected');
					
					grid.elem.trigger('grid:select', [ tr ]);
				}
				
				event.stopPropagation();
			});
		};

	Grid.prototype.init = function() {
		this._updateRows(this.body.find('tr'), this);
	};

	/**
	 * Get grid rows matching the selector.
	 *
	 * The selector may be an array of row indexes (for numeric items) or ids (otherwise).
	 * The selector may be row index (if numeric).
	 * The selector may be any jQuery compatible selector.
	 *
	 * If omitted all rows returned.
	 *
	 * @param selector the selector
	 * @return jQuery object of <tr>'s
	 */
	Grid.prototype.rows = function(selector) {
		let operator = function(rows) { return rows; };

		if (Array.isArray(selector)) {
			const grid = this;

			operator = function(rows) {
				return rows.filter(function(index, elem) {
					let result = false;
					$.each(selector, function(_, item) {
						if (typeof item === 'number') {
							if (item == index) {
								result = true;
								return false;
							}
						}
						else if (typeof item === 'object') {
							if (item[grid.settings.id] == $(elem).attr('row-id')) {
								result = true;
								return false;
							}
						}
						else {
							if (item == $(elem).attr('row-id')) {
								result = true;
								return false;
							}
						}
					});
					return result;
				});
			}
		}
		else if (typeof selector === 'number') {
			operator = function(rows) {
				return rows.eq(selector + 1);
			};
		}
		else if (selector !== undefined) {
			operator = function(rows) {
				return rows.filter(selector);
			};
		}

		return operator(this.body.find('tr'));
	};

	/**
	 * Get grid's <thead> element.
	 * 
	 * @returns {jQuery} grid head
	 */
	Grid.prototype.head = function() {
		return this.head;
	};
	
	Grid.prototype.format = function(name, fmt) {
		var grid = this;
		$.each(Array.isArray(name) ? name : name.split(/[ ,]/), function() {
			grid.columns.filter('[name="' + this + '"]').data('format', fmt ? fmt : formatAny);
		});
	};

	Grid.prototype.setColumnHidden = function(name, hidden) {
		var col = this.columns.filter('[name="' + name + '"]');
		if (col.length && !col.data('grid-hidden') != !hidden) {
			col.data('grid-hidden', hidden);
			
			var selector = ':nth-child(' + (1 + col.index()) + ')';
			if (hidden) {
				col.data('grid-saved-width', col.css('width')).css({'width': 0, 'visibility': 'collapse'});
				
				if (this.settings.fixedHeader)
					this.head.parent().find('colgroup col' + selector).css({'width': 0, 'visibility': 'collapse'});
				
				this.head.find(selector).css({ 'visibility': 'collapse', 'white-space': 'nowrap' });
				this.body.find(selector).css({ 'visibility': 'collapse', 'white-space': 'nowrap' });
			}
			else {
				var width = col.data('grid-saved-width') || 'auto';

				if (this.settings.fixedHeader)
					this.head.parent().find('colgroup col' + selector).css({ 'width': width, 'visibility': ''});

				col.css('width', width).removeData('grid-saved-width');
				
				this.head.find(selector).css({ 'visibility': '', 'white-space': '' });
				this.body.find(selector).css({ 'visibility': '', 'white-space': '' });
			}
		}
	};
	
	Grid.prototype.setColumnWidth = function (name, width) {
		var col = this.columns.filter('[name="' + name + '"]');
		col.css('width', width);

		if (this.settings.fixedHeader) {
			var selector = ':nth-child(' + (1 + col.index()) + ')';
			this.head.parent().find('colgroup col' + selector).css('width', width);
		}
	};

	/**
	 * Prepends data to the grid.
	 * 
	 * The data argument may be either jQuary object containing 'tr' elements,
	 * an array of records or a single record object.
	 * 
	 * The optional context may be either jQuery object of parent row,
	 * string with parent id, number of row index after which the data should be inserted, or an
	 * object of additional row properties.
	 * 
	 * Standard properties are 'parent', 'parent_id', 'index'.
	 * 
	 * @param {jQuery|Array|Object} data
	 * @param {jQuery|String|Number|Object} ctx
	 */
	Grid.prototype.prepend = function(data, ctx) {
		this._clearMessage();
		this._clearLoader();

		if (data) {
			ctx = this._normalizeContext(ctx);
			data = this._normalizeData(data, ctx, this);

			var parent, sibling;
			if (ctx.parent && ctx.parent.length > 0) {
				parent = ctx.parent;
				sibling = this.body.find('tr[parent-id="' + ctx.parent.attr('row-id') + '"]');
			}
			else {
				sibling = this.body.find('tr').not('[parent-id]');
			}
				
			if (ctx.index !== undefined && ctx.index < sibling.length)
				sibling = sibling.eq(ctx.index);
			else
				sibling = sibling.first();

			if (sibling.length > 0)
				sibling.before(data);
			else if (parent)
				parent.after(data);
			else
				this.body.prepend(data);

			this._updateRows(data, this);

			this.elem.trigger('grid:prepend', [data]);
		}
	};

	/**
	 * Appends data to the grid.
	 * 
	 * The data argument may be either jQuary object containing 'tr' elements,
	 * an array of records or a single record object.
	 * 
	 * The optional context may be either jQuery object of parent row,
	 * string with parent id, number of row index after which the data should be inserted, or an
	 * object of additional row properties.
	 * 
	 * Standard properties are 'parent', 'parent_id', 'index'.
	 * 
	 * @param {jQuery|Array|Object} data
	 * @param {jQuery|String|Number|Object} ctx
	 */
	Grid.prototype.append = function(data, ctx) {
		this._clearMessage();
		this._clearLoader();

		if (data) {
			ctx = this._normalizeContext(ctx);
			data = this._normalizeData(data, ctx, this);

			var parent, sibling;
			if (ctx.parent && ctx.parent.length > 0) {
				parent = ctx.parent;
				sibling = this.body.find('tr[parent-id="' + ctx.parent.attr('row-id') + '"]');
			}
			else {
				sibling = this.body.find('tr').not('[parent-id]');
			}
				
			if (ctx.index !== undefined && ctx.index < sibling.length)
				sibling = sibling.eq(ctx.index + 1);
			else
				sibling = $([]);

			if (sibling.length > 0)
				sibling.after(data);
			else if (parent)
				parent.after(data);
			else
				this.body.append(data);

			this._updateRows(data, this);

			this.elem.trigger('grid:append', [data]);
		}
	};

	Grid.prototype.update = function(data) {
		this._clearMessage();
		this._clearLoader();
		
		var grid = this;
		
		var updateRow = function() {
			grid.body.find('tr[row-id="' + $(this).attr('row-id') + '"]')
				.empty()
				.append($(this).children());
		};

		if (data instanceof $) {
			return data.each(updateRow);
		}
		else {
			if (!Array.isArray(data))
				data = [ data ];

			$.each(data, function(index, row) {
				if (row instanceof $)
					updateRow.call(row);
				else if($.isPlainObject(row)) {
					var tr = grid.body.find('tr[row-id="' + get_value(row, grid.settings.id) + '"]');
					if (tr.length > 0) {
						grid.columns.each(function(index, col) {
							const n = $(col).attr('name');
							const v = get_value(row, n);
							if (v !== undefined || grid.settings.functionalColumns.includes(n)) {
								let value = $(col).data('format').call(row, v, n);
								if (typeof value === 'string')
									value = document.createTextNode(value);
								else if (value === undefined || value === null)
									value = '';

								tr.find('td').eq(index).empty().append(value);
							}
						});

						$.each(grid.settings.attr,  function(name, field) {
							const v = get_value(row, field);
							if (v !== undefined)
								tr.attr(name, v);
						});

						$.each(grid.settings.data,  function(name, field) {
							const v = get_value(row, field);
							if (v !== undefined)
								tr.data(name, v);
						});

						$.extend(tr.data('row'), row);
					}
				}
			});
		}
	};
	
	Grid.prototype.remove = function(row) {
		var tr;
		if (row instanceof $)
			tr = row.filter('tr');
		else
			tr = this.body.find('tr[row-id="' + row + '"]');

		if (tr.length) {
			this._removeChildren(tr, this);
			tr.remove();
		}
	};
	
	/**
	 * Returns row index within a set of siblings.
	 * 
	 * @param {jQuery|String} row
	 * @returns {Number} row index
	 */
	Grid.prototype.index = function(row) {
		var tr;
		if (row instanceof $)
			tr = row.filter('tr');
		else
			tr = this.body.find('tr[row-id="' + row + '"]');
		
		if (tr.length) {
			var parent_id = tr.attr('parent-id'), sibling;
			if (parent_id)
				sibling = this.body.find('tr[parent-id="' + parent_id + '"]');
			else
				sibling = this.body.find('tr').not('[parent-id]');
			
			return sibling.index(tr);
		}
		else
			return -1;
	};

	Grid.prototype.clear = function() {
		this._clearMessage();
		this._clearLoader();
		this.body.empty();
		this.elem.trigger('grid:clear');
	};

	Grid.prototype.clearLookup = function() {
		this.lookups.val('').data('lookup-prev', '');
	};

	Grid.prototype.lookup = function(template) {
		var lookup = $.extend({ }, template);
		this.lookups.each(function() {
			var value = $(this).val();
			if (value || value === 0)
				lookup[$(this).attr('name')] = value;
		});

		var order = this._getOrder();
		if (!$.isEmptyObject(order)) lookup['grid:order'] = order;

		return $.isEmptyObject(lookup) ? null : lookup;
	};

	/**
	 * Sets/gets grid selection.
	 * 
	 * @param {Array|jQuery} selection new selection or nothing in order to get selection
	 * @param {String} action 'add', 'remove' or unspecified
	 * @returns {Array} current selection in case if get
	 */
	Grid.prototype.selection = function(selection, action) {
		if (selection === undefined) {
			return this.body.find('tr.selected').map(function() {
				return $(this).attr('row-id');
			}).get();
		}
		else {
			var index = this.settings.selectColumnIndex;
			
			if (action === undefined) {
				this.body.find('tr.selected')
					.removeClass('selected')
					.each(function() {
						$('td', this).eq(index).find('input').prop('checked', false);
					});
			}
			
			if (action == 'remove') {
				var rows;
				
				if (selection instanceof $)
					rows = selection.filter('tr');
				else
					rows = this.body.find('tr').filter(function() {
						return in_array($(this).attr('row-id'), selection);
					});
			
				rows.removeClass('selected')
					.each(function() {
						$('td', this).eq(index).find('input').prop('checked', false);
					});
				
				this.elem.trigger('grid:select', [ rows ]);
			}
			else {
				var rows;
				
				if (selection instanceof $)
					rows = selection.filter('tr');
				else
					rows = this.body.find('tr').filter(function() {
						return in_array($(this).attr('row-id'), selection);
					});

				if (this.settings.selectionMode == 'single') {
					rows = rows.last();

					this.body.find('tr').removeClass('selected').each(function() {
						$('td', this).eq(index).find('input').prop('checked', false);
					});
				}
				
				rows.addClass('selected')
					.each(function() {
						$('td', this).eq(index).find('input').prop('checked', true);
					});

				this.elem.trigger('grid:select', [ rows ]);
			}
		}
	};
    
    Grid.prototype.selectedRows = function() {
		return this.body.find('tr.selected');
    };

	/**
	 * Gets selected rows IDs.
	 * 
	 * @param {string} selector row selector (if ommited all rows applied)
	 * @returns {Array} row IDs
	 */
	Grid.prototype.ids = function(selector) {
		return this.rows(selector).map(function() {
			return $(this).attr('row-id');
		}).get();
	};

	Grid.prototype.size = function() {
		return this.body.get(0).rows.length;
	};

	Grid.prototype.parent = function(tr) {
		return this.body.find('tr[row-id="' + tr.attr('parent-id') + '"]');
	};

	Grid.prototype.loader = function () {
		this._clearMessage();

		const self = this;
		const spinner = $('<div class="grid-loader"></div>')
			.html('<div></div>'.repeat(12))
			.appendTo(self.elem.parent());
	}

	Grid.prototype.alert = function (message) {
		this._clearLoader();
		var self = this;

		$('<div class="grid-alert"></div>')
				.html(message || this.settings.defaultAlertMessage)
				.appendTo(self.elem.parent());
	};

	Grid.prototype.message = function (message) {
		this._clearLoader();
		var self = this;

		$('<div class="grid-message"></div>')
				.html(message || this.settings.defaultMessage)
				.appendTo(self.elem.parent());
	};

	/**
	 * Toggles the row expanded/collapsed.
	 *
	 * @param {jQuery} tr the table row to toggle
	 */
	Grid.prototype.toggle = function(tr) {
		if (tr.is('.expanded'))
			this.collapse(tr);
		else if (tr.hasClass('collapsed'))
			this.expand(tr);
	};

	/**
	 * @param {jQuery} tr
	 */
	Grid.prototype.expand = function(tr) {
		if (tr.is('.collapsed')) {
			var count = this._showChildren(tr, this);

			tr.removeClass('collapsed').addClass('expanded');
			this.elem.trigger('grid:expand', [ tr, count ]);
		}
	};

	/**
	 * @param {jQuery} tr
	 */
	Grid.prototype.collapse = function(tr) {
		if (tr.is('.expanded')) {
			var count = this._hideChildren(tr, this);

			tr.removeClass('expanded').addClass('collapsed');
			this.elem.trigger('grid:collapse', [ tr, count ]);
		}
	};

	/**
	 * @param {jQuery} tr
	 * @param {Grid} grid
	 * @return {Number}
	 */
	Grid.prototype._hideChildren = function(tr, grid) {
		var count = 0;
		return grid.body.find('tr[parent-id="' + tr.attr('row-id') + '"]').hide().each(function() {
			var child = $(this);
			if (child.is('.expanded'))
				count += grid._hideChildren(child, grid);
		}).length + count;
	};

	/**
	 * @param {jQuery} tr
	 * @param {Grid} grid
	 * @return {Number}
	 */
	Grid.prototype._showChildren = function(tr, grid) {
		var count = 0;
		return grid.body.find('tr[parent-id="' + tr.attr('row-id') + '"]').show().each(function() {
			var child = $(this);
			if (child.is('.expanded'))
				count += grid._showChildren(child, grid);
		}).length + count;
	};

	/**
	 * @param {jQuery} tr
	 * @param {Grid} grid
	 */
	Grid.prototype._removeChildren = function(tr, grid) {
		grid.body.find('tr[parent-id="' + tr.attr('row-id') + '"]')
			.each(function() { grid._removeChildren($(this), grid); })
			.remove();
	};

	/**
	 * Normalizes context returning context as object.
	 * 
	 * @param {jQuery|String|Object} context
	 * @return {Object} normalized context
	 */
	Grid.prototype._normalizeContext = function(context) {
		if ($.isPlainObject(context)) {
			if (context.parent_id !== undefined)
				context.parent = this.body.find('tr[row-id="' + context.parent_id + '"]').first();
			return context;
		}
		else if (context instanceof $)
			return { parent: context.filter('tr').first() };
		else if (context)
			return { parent: this.body.find('tr[row-id="' + context + '"]').first() };
		else
			return { };
	};

	/**
	 * @param {Object} data
	 * @param {Object} ctx
	 * @param {Grid} grid
	 * @return {jQuery}
	 */
	Grid.prototype._normalizeData = function(data, ctx, grid) {
		var hideCells = function(row) {
			var cells = row.children('td');
			grid.columns.each(function(index, col) {
				if ($(col).data('grid-hidden'))
					cells.eq(index).css({ 'visibility': 'collapse', 'white-space': 'nowrap' });
			});
		};
		
		if (data instanceof $) {
			if (ctx.parent && ctx.parent.length) {
				var parent_id = ctx.parent.attr('row-id');
				return data.each(function() {
					var tr = $(this);

					if (!tr.attr('parent-id'))
						tr.attr('parent-id', parent_id);

					hideCells(tr);
				});
			}
		}
		else {
			if (!Array.isArray(data))
				data = [ data ];

			data = $.map(data, function(row) {
				var tr = (row instanceof $) ? row : grid._createRow($.extend(row, ctx));
				
				hideCells(tr);
				return tr;
			});

			// convert array of jQuery objects to a single jQuery object
			return $(data).map(function() { return this.toArray(); });
		}
	};

	/**
	 * @param {Object} row
	 * @returns {jQuery}
	 */
	Grid.prototype._createRow = function(row) {
		var grid = this;
		
		var tr = $('<tr></tr>')
			.attr('row-id', get_value(row, grid.settings.id))
			.data('row', row)
			.append(this.columns.map(function(index, col) {
				const n = $(col).attr('name');
				const v = get_value(row, n);

				let value = $(col).data('format').call(row, v, n);
				if (typeof value === 'string')
					value = document.createTextNode(value);
				else if (value === undefined || value === null)
					value = '';
				return $('<td></td>').append(value).toArray();
			}));
			
		if (row.parent && row.parent.length)
			tr.attr('parent-id', row.parent.attr('row-id'));
		else if (row.parent_id)
			tr.attr('parent-id', row.parent_id);

		$.each(this.settings.attr,  function(name, field) {
			tr.attr(name, get_value(row, field));
		});

		$.each(this.settings.data,  function(name, field) {
			tr.data(name, get_value(row, field));
		});

		return tr;
	};

	/**
	 * @param {jQuery} rows
	 * @param {Grid} grid
	 */
	Grid.prototype._updateRows = function(rows, grid) {
		var levels = { };
		var collapsed = { };

		rows.each(function() {
			var tr = $(this);

			var parent_id = tr.attr('parent-id'), level = 0;
			if (parent_id) {
				if (levels[parent_id] === undefined) {
					var parent = grid.body.find('tr[row-id="' + parent_id + '"]');
					levels[parent_id] = grid._getLevel(parent);
					collapsed[parent_id] = parent.is('.collapsed');
				}

				level = levels[parent_id] + 1;

				if (collapsed[parent_id])
					tr.hide();
			}
			
			levels[tr.attr('row-id')] = level;

			grid._updateIndenter(tr, level);

			if (tr.is('.collapsed'))
				grid._hideChildren(tr, grid);
		});
	};

	/**
	 * @param {jQuery} tr
	 * @param {Number} level
	 */
	Grid.prototype._updateIndenter = function(tr, level) {
		if (this.settings.expandColumnIndex !== null) {
			var indenter = tr.find('span.indenter');
			if (indenter.length === 0) {
				indenter = $('<span class="indenter"></span>')
					.html('<a href="#">&nbsp;</a>')
					.prependTo(tr.find('td').eq(this.settings.expandColumnIndex));
			}

			indenter.css('padding-left', (8 * level) + 'px');
		}
	};

	/**
	 * @param {jQuery} tr
	 * @returns {Number}
	 */
	Grid.prototype._getLevel = function(tr) {
		var parent_id = tr.attr('parent-id');
		if (parent_id === undefined)
			return 0;

		return this._getLevel(this.body.find('tr[row-id="' + parent_id + '"]')) + 1;
	};

	/**
	 * Collects and returns order information.
	 *
	 * @returns {Object}
	 */
	Grid.prototype._getOrder = function() {
		var darr = $('<span>&darr;</span>').html();
		var uarr = $('<span>&uarr;</span>').html();

		var order = { };
		this.head.find('span.grid-order').each(function() {
			var span = $(this);

			if (span.html() == darr)
				order[span.parent().attr('name')] = true;

			if (span.html() == uarr)
				order[span.parent().attr('name')] = false;
		});

		return order;
	};

	/**
	 * Sets column ordering.
	 *
	 * @param {String} name column name
	 * @param {Boolean} asc ordering
	 */
	Grid.prototype._setOrder = function(name, asc) {
		this.head.find('*[name="' + name + '"][order="true"]')
			.find('span.grid-order').remove().end()
			.first().append($('<span class="grid-order"></span>').html(asc ? '&darr;' : '&uarr;'));
	};

	/**
	 * Clears ordering.
	 */
	Grid.prototype._clearOrder = function() {
		this.head.find('span.grid-order').remove();
	};

	/**
	 * Clears loaders icon.
	 */
	Grid.prototype._clearLoader = function () {
		this.elem.parent().find('.grid-loader').remove();
	}

	/**
	 * Clears alert message.
	 */
	Grid.prototype._clearAlert = function() {
		this.elem.parent().find('.grid-alert').remove();
	};

	/**
	 * Clears all messages.
	 */
	Grid.prototype._clearMessage = function() {
		this.elem.parent().find('.grid-alert').remove();
		this.elem.parent().find('.grid-message').remove();
	};

	$.fn.grid = function(method) {
		var options;

		if ($.isPlainObject(method) || !method) {
			options = method;
			method = 'init';
		}

		if (Grid.prototype[method]) {
			var rval, args = Array.prototype.slice.call(arguments, 1);

			this.each(function() {
				var elem = $(this);
				var grid = elem.data('grid');
				if (grid === undefined) {
					grid = new Grid(elem, options);
					elem.data('grid', grid);
				}

				rval = Grid.prototype[method].apply(grid, args);
				return rval === undefined;
			});

			return rval === undefined ? this : rval;
		}

		return $.error("Method " + method + " doesn't exist in jquery-grid");
	};
})(jQuery);
