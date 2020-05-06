$.util = $.extend($.util, {
	/**
	 * Schedules function invocation with specified arguments and optional `this` argument.
	 */
	schedule: function(/* args..., func, [thisArg] */) {
		const a = Array.prototype.slice.call(arguments);
		if ($.isFunction(a[a.length - 1])) a.push(null);

		setTimeout(function() { a[a.length - 2].apply(a[a.length - 1], a); }, 0);
	},

	/**
	 * Performs asynchronous function repetitive execution up to count times.
	 * If proc fails it must call 'this.failed()'.
	 * 
	 * @param {Number} count number ot retries
	 * @param {Function} proc function to execute
	 * @param {Function} fail optional function to execute on failure
	 * @returns {Boolean} execution result
	 */
	retry: function(count, proc, fail) {
		var execute = function() {
			if (count-- > 0)
				proc.call(null, { failed: function() { setTimeout(execute); }});
			else if ($.isFunction(fail))
				fail.call();
		};
		
		execute.call();
	},

	/**
	 * Performs repetitive function execution till it returns true.
	 * Tracks execution time and executes the proc asynchronously if necessary to avoid browser stuck.
	 *
	 * @param {Object} optional context
	 * @param {Function} proc the function to execute
	 */
	heavy: function(context, proc) {
		if (proc === undefined) {
			proc = context;
			context = null;
		}

		var execute = function() {
			var t = Date.now();
			while (proc.call(context)) {
				if (Date.now() - t > 1000) {
					setTimeout(execute);
					break;
				}
			}
		};
		
		execute.call(context);
	},
	
	/**
	 * Returns URI query parameter or all parameters if the name is omitted.
	 * 
	 * @param {String} name optional
	 * @param {String} defval optional default value
	 * @returns {String|Object}
	 */
	query: function(name, defval) {
		if (!$.util.query_) {
			var q = {};
			var a = window.location.search.substr(1).split('&');
			for (var i = 0; i < a.length; i++) {
				var b = a[i].split('=');
				q[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
			}

			$.util.query_ = q;		
		}
		
		return name === undefined ? $.util.query_ : $.util.query_[name] || defval;
	}
});

$.fn.extend({
	/**
	 * Binds an event handler to be executed first over other handlers.
	 * 
	 * @param {String} name event type
	 * @param {Function} fn event handler
	 * @returns {jquery}
	 */
	bindFirst: function(name, fn) {
		this.on(name, fn);

		return this.each(function() {
			var handlers = $._data(this, 'events')[name.split('.')[0]];
			var handler = handlers.pop();
			handlers.splice(0, 0, handler);
		});
	},

	appendText: function(text) {
		return this.each(function() {
			$(this).append(document.createTextNode(text));
		});
	},

	/**
	 * Selects text of the specified element.
	 * If positions are specified, the cursor/selection is placed at specified positions.
	 * If boolean is specified, the cursor is placed at the begginning (true) or end (false).
	 * If nothing is specified, the whole text is selected.
	 * 
	 * @param {Number|Boolean} start position or collapse behavior (see above)
	 * @param {Number} end position (optional)
	 * @returns {jquery}
	 */
	selectText: function(start, end) {
		var collapse = undefined;
		if (end === undefined) {
			if ($.isNumeric(start)) {
				collapse = true;
				end = start;
			}
			else {
				collapse = start;
				start = 0;
				end = Number.POSITIVE_INFINITY;
			}
		}

		if (document.body.createTextRange) {
			this.each(function() {
				if (this.tagName == 'INPUT' || this.tagName == 'TEXTAREA') {
					var range = this.createTextRange();
					range.moveStart('character', Math.min(start, this.value.length));
					range.moveEnd('character', Math.min(end, this.value.length));

					if (collapse !== undefined)
						range.collapse(collapse);

					range.select();
				}
				else {
					var range = document.body.createTextRange();
					range.moveToElementText(this);

					if (collapse !== undefined)
						range.collapse(collapse);

					range.select();
				}
			});
		}
		else if (window.getSelection) {
			var selection = window.getSelection();
			selection.removeAllRanges();
			
			this.each(function() {
				if (this.tagName == 'INPUT' || this.tagName == 'TEXTAREA') {
					if (collapse === true)
						this.setSelectionRange(0, 0);
					else if (collapse === false)
						this.setSelectionRange(this.value.length, this.value.length);
					else {
						this.setSelectionRange(
							Math.min(start, this.value.length),
							Math.min(end, this.value.length));
					}
				}
				else {
					var range = document.createRange();
					range.selectNodeContents(this);

					if (collapse !== undefined)
						range.collapse(collapse);

					selection.addRange(range);
				}
			});
		}

		return this;
	},

	/**
	 * Executes function over the jQuery element making sure it is displayed, thus allowing to
	 * determine its actual height/width, etc.
	 * 
	 * @param {Function} func
	 * @returns {Object}
	 */
	actual: function(func) {
		var self = this[0];
		
		var actual = function() {
			if (this != document.body) {
				if (this.style.display == 'none') {
					var visibility = this.style.visibility;
					this.style.visibility = 'hidden';
					this.style.display = 'block';

					var result = actual.call(this.parentNode);
					
					this.style.display = 'none';
					this.style.visibility = visibility;
					
					return result;
				}
				else
					return actual.call(this.parentNode);
			}
			else
				return func.call(self);
		};
		
		return actual.call(self);
	}
});

$.extend($.expr[':'], {
    noval: function(input) {
        return $(input).val() === '';
    }
});

/*
$.widget('ui.autocomplete', $.ui.autocomplete, {
	options: {
		autoFocus: true,
		autoShow: true,
		emptyItem: { }
	},
	
	_create: function() {
		const instance = this;

		instance._super();
		
		instance.element
			.on('keydown.hack', function(event) {
				if (instance.menu.element.is(':visible')) {
					$.util.schedule(instance._value(), function(value) {
						if (value != instance._value())
							instance.menu.element.menu('blur');
					});
				}
				else if (instance.options.autoShow) {
					// automatically show drop-down
					instance._searchTimeout(event);
				}
			})
			.on(instance.widgetEventPrefix + 'change.hack', function(event, ui) {
				if (!ui.item && !instance.options.disabled) {
					if (instance._value()) {
						instance.source({ term: instance._value() }, function(content) {
							if (content) {
								content = instance._normalize(content);

								if (content.length)
									instance._initEmptyItem(content[0]);
							}

							instance._trigger("response", null, { content: content } );

							if (content.length == 1)
								instance._selectItem(event, content[0]);
							else {
								var selectedItem = null;
								$.each(content, function(index, item) {
									if (item.value == instance._value()) {
										selectedItem = item;
										return false;
									}
								});

								instance._selectItem(event, selectedItem);
							}

							instance.element.trigger('change');
						});
					}
					else {
						instance._selectItem(event, instance.options.emptyItem);
						instance.element.trigger('change');
					}
				}
				else
					instance.element.trigger('change');
			});

		const renderItem = self._renderItem;

		self._renderItem = function(ul, item) {
			this._initEmptyItem(item);
			this._renderItem = renderItem;
			return this._renderItem.call(this, ul, item);
		};
	},

	_initEmptyItem: function(item) {
		for (let name in item)
			this.options.emptyItem[name] = null;
	},

	_selectItem: function(event, item) {
		if (false !== this._trigger("select", event, { item: item })) {
			if (item)
				this._value(item.value);
		}

		// reset the term after the select event
		// this allows custom select handling to work properly
		this.term = this._value();
		this.selectedItem = item;
	},

	select: function(value) {
		this._value(value, false); // do not fire change event
		this._trigger('change', null, { item: null });
	}
});
*/

$.widget('ui.dialog', $.ui.dialog, {
	options: {
		modal: true,
		autoOpen: false,
		resizable: false,
		closeOnEscape: false
	},

	_create: function() {
		const self = this;
		const buttons = self.options.buttons;
		$.each(buttons, function(label, action) {
			if (typeof action == 'string')
				buttons[label] = function() { self.handle(action); }
		});

		//
		console.log('JQuery hacking dialog ' + $(self.element).attr('id'));
		//

		self._super();

		const findDefaultButton = function(_) {
			const c = $('.ui-dialog-buttonpane', _);
			const d = $('button[isdefault="true"]', c);
			return d.length ? d.first() : $('button:first', c);
		};

		$(self.element).parent()
			.attr('tabindex', '0') // make the dialog pane focusable
			.on('focus', function() {
				findDefaultButton(this).focus();
			})
			.on('keydown', function(event) {
				if (event.which == $.ui.keyCode.ENTER) {
					findDefaultButton(this).focus(); // that is enough to make default button be hit
					event.stopPropagation();
				}

				if (event.which == $.ui.keyCode.ESCAPE) {
					self.button('Cancel', 'click') || self.button('Close', 'click'); // TODO find elegant solution
					event.stopPropagation();
				}
			});
	},

	open: function(handler) {
		this._handler = handler;
		this._super();
	},

	data: function() {
			if (arguments.length) {
				const data = $.extend({ }, arguments[0]);

				$('[name]', this.element).each(function() {
					$(this).val(data[$(this).attr('name')] || null);
				});
			}
			else {
				return $('[name]', this.element).get().reduce(function(data, elem) {
					data[$(elem).attr('name')] = $(elem).val(); return data;
				}, { });
			}
	},

	button: function(name, action) {
		const button = $('.ui-dialog-buttonpane button:contains(' + name + ')', this.element.parent());
		if (button.length > 0) {
			if ($.isFunction(action))
				button.each(action);
			else
				$.fn[action].call(button);
			return true;
		}
		else
			return false;
	},

	handle: function(action) {
		if ($.isFunction(this._handler))
			this._handler.call(this.element, action);
	}
});

$.dialog = function(name, defs) {
	$.fn[name] = function() {
		return arguments.length ? this.dialog.apply(this, arguments) : this.dialog(defs);
	};
};

