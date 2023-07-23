/**
 * @author Yuri Plaksyuk <yuri.plaksyuk@chestnutcorp.com>
 * @since Feb 25, 2020
 */
(function($) {
	const locale = 'en-US';

	$.format = $.extend($.format, {

		/**
		 * Create any formatter that converts value to a string object.
		 *
		 * @return {Function} a single parameter formatter function.
		 */
		any: function() {
			return function(v) { return (v !== undefined && v !== null) ? v.toString() : ''; };
		},

		/**
		 * Create and return date formatter.
		 *
		 * @param {String} patternOpt an optional date format pattern.
		 * @param {Boolean} utcOpt an optional UTC flag, defaults to false.
		 * @return {Function} a single parameter formatter function.
		 */
		date: function(patternOpt, utcOpt) {
			// TODO: use standard Intl formatter object
			return function(v) { return Date.isDate(v) && v.format(patternOpt, utcOpt) || ''; };
		},

		/**
		 * Create and return money formatter.
		 *
		 * @param {Boolean} allowEmptyOpt an optional flag to use empty string for zero values, defaults to false.
		 * @param {String} currencyOpt an optional currency code, defaults to 'USD'.
		 * @return {Function} a single parameter formatter function.
		 */
		money: function(allowEmptyOpt, currencyOpt) {
			const f = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyOpt || 'USD' });

			return function(v) {
				return (typeof v === 'number' && (v || !allowEmptyOpt)) ? f.format(v / 100) : '';
			}
		}
	});

	// provide `then` for backward compatibility with legacy sync approach
	const then = function(next) { return typeof next === 'function' ? next() : true; };

	$.validator = $.extend($.validator, {
		mandatory: function() {
			return function(next) {
				const v = $(this).input('get');
				if (v === null || v === '')
					$(this).input('message', '{0} is mandatory.');
				else
					return then(next);
			};
		},

		minlength: function(minlength) {
			return function(next) {
				const l = $(this).input('format').length;
				if (l > 0 && l < minlength)
					$(this).input('message', '{0} must contain at least {1} characters.', minlength);
				else
					return then(next);
			};
		},

		length: function(min, max) {
			return function(next) {
				const l = $(this).input('format').length;
				if (l > 0) {
					if (max === undefined && l != min)
						$(this).input('message', '{0} must contain exactly {1} characters.', min);
					else if (l < min)
						$(this).input('message', '{0} must contain at least {1} characters.', min);
					else if (l > max)
						$(this).input('message', '{0} must contain no more than {1} characters.', max);
					else
						return then(next);
				}
				else
					return then(next);
			};
		},

		maxlength: function(maxlength) {
			return function(next) {
				const l = $(this).input('format').length;
				if(l > 0 && l > maxlength) {
					$(this).input('message', '{0} must contain no more than {1} characters.', maxlength);
				}
				else
					return then(next);
			}
		},

		positive: function() {
			return function(next) {
				const v = $(this).input('get');
				if (typeof v === 'number' && v <= 0)
					$(this).input('message', '{0} must be greater than 0.');
				else
					return then(next);
			};
		},

		alphanumeric: function() {
			return function(next) {
				const v = $(this).input('format');
				if (v.length > 0 && !v.match(/^[A-Z|a-z|0-9].*$/))
					$(this).inout('message', 'First character in {0} must be alpha-numeric.');
				else
					return then(next);
			};
		},

		alpha: function() {
			return function(next) {
				const v = $(this).input('format');
				if (v.length > 0 && !v.match(/^[A-Z|a-z].*$/))
					$(this).input('message', 'First character in {0} must be an alpha character.');
				else
					return then(next);
			};
		},

		numeric: function() {
			return function(next) {
				const v = $(this).input('format');
				if (v.length > 0 && !v.match(/^\d+$/))
					$(this).input('message', 'A number should be specified in {0}.');
				else
					return then(next);
			};
		},

		minmax: function(minval, maxval) {
			return function(next) {
				const v = $(this).input('format');
				if (v.length > 0 && (+v < minval || +v > maxval))
					$(this).input('message', 'The value entered in {0} must be greater than or equal to {1} and less than or equal to {2}.', minval, maxval);
				else
					return then(next);
			};
		},

		min: function (minval, strict = false) {
			return function (next) {
				let v = $(this).input('get');
				
				if (($(this).is('.money') && v !== null) || (!$(this).is('.money') && v.length > 0)) {
					$(this).is('.money') && (v /= 100);
					
					if (!strict && +v < minval)
						$(this).input('message', 'The value entered in {0} must be greater than or equal to {1}.', minval);
					else if (strict && +v <= minval)
						$(this).input('message', 'The value entered in {0} must be greater than {1}.', minval);
					else
						return then(next);
				}
				else
					return then(next);
			}
		},

		max: function (maxval, strict = false) {
			return function (next) { 
				let v = $(this).input('get');
	
				if (($(this).is('.money') && v !== null) || (!$(this).is('.money') && v.length > 0)) {
					$(this).is('.money') && (v /= 100);
					
					if (!strict && +v > maxval)
						$(this).input('message', 'The value entered in {0} must be less than or equal to {1}.', maxval);
					else if (strict && +v >= maxval)
						$(this).input('message', 'The value entered in {0} must be less than {1}.', maxval);
					else
						return then(next);
				}
				else
					return then(next);
			}
		},

		hour: function() {
			return function(next) {
				const v = $(this).input('format');
				if (v.length > 0 && !(v.match(/^\d{1,2}$/) && ((v >= 0 && v <= 23) || v == 99)))
					$(this).input('message', 'Hour in {0} must be a value between 00 and 23 inclusive or 99.');
				else
					return then(next);
			};
		},

		past: function() {
			return function(next) {
				const v = $(this).input('get');
				if (v != null && v >= new Date())
					$(this).input('message', '{0} may not be in future.');
				else
					return then(next);
			};
		},

		future: function() {
			return function(next) {
				const v = $(this).input('get');
				if (v != null && v <= new Date())
					$(this).input('message', '{0} may not be in past.');
				else
					return then(next);
			};
		},

		list: function() {
			const list = Array.prototype.slice.call(arguments);

			return function(next) {
				if (list.indexOf($(this).input('get')) == -1)
					$(this).input('message', '{0} must be one of {1}', list.join());
				else
					return then(next);
			};
		},
	});


	const base = {
		debug: false,
		element: null,
		formatter: $.format.any(),

		create: function(e) {
			this.element = e;
		},
		destroy: function() {
			this.element = null;
		},
		get: function() {
			const v = this.element.is('input,textarea') ? this.element.prop('value') : Array.prototype.reduce.call(this.element.prop('childNodes') || [], function j(t, n) {
				return t + (n.nodeType == 3 ? n.textContent : Array.prototype.reduce.call(n.childNodes || [], j, n.value || ''));
			}, '');

			return this.normalize_(v);
		},
		set: function(v, t) {
			v = this.normalize_(v);

			if (this.element.is('input,textarea')) {
				if (this.element.prop('value') != v) {
					this.element.prop('value', v);
					this.triggerChangeIf_(true, t);
				}
				else
					this.triggerChangeIf_(false, t);
			}
			else {
				if (this.element.text() != v) {
					this.element.text(v);
					this.triggerChangeIf_(true, t);
				}
				else
					this.triggerChangeIf_(false, t);
			}
		},
		data: function() {
			const self = this;
			return new Promise(function(resolve) { resolve(self.get()); });
		},
		format: function() {
			return this.formatter.call(null, this.get());
		},
		validate: function(f) {
			const x = function() {
				const v = this.element.data('validate');
				if (Array.isArray(v)) return v;

				const a = [ ]; this.element.data('validate', a);
				if (typeof v === 'string') {
					const r = /(\w+)(\(([^)]*)\))?/g;
					for (let m = r.exec(v); m; m = r.exec(v)) {
						const p = m[3] ? JSON.parse('[' + m[3].replace(/\'/g, '"') + ']') : [ ];
						const f = $.validator[m[1]];
						a.push(f.apply(null, p));
					}
				}

				return a;
			};

			if (f.length) {
				x.call(this).push(f);
			}
			else {
				const q = [ ];
				const p = function() { if (this.input) q.push(this.input); };
				const e = this.element.get(0);

				// create a list of elements being validated in correct order: inner elements first, outer next.
				this.element.find('.input').each(p); p.call(e);

				const v = function() {
					const i = q.shift();
					if (i) {
						if (i.element.prop('disabled') || i.element.is(':hidden') || i.element.is('[readonly]')) {
							setTimeout(v, 0); // if the current element is disabled, hidden or readonly, step to the next one
						}
						else {
							const a = x.call(i).slice();
							const e = i.element.get(0);

							const n = function() {
								const f = a.shift();
								if (f)
									f.call(e, n);
								else
									setTimeout(v, 0);
							};

							setTimeout(n, 0);
						}
					}
					else
						f.call(e);
				};

				v.call(); // validate all the elements in the queue
			}
		},
		focus: function() {
			const element = this.element();
			setTimeout(function() { element.trigger('focus'); }, 0);
		},
		message: function() {
			const a = Array.prototype.slice.call(arguments);

			var f = window.alert;
			var k = undefined;
			var m = a.shift();
			if (typeof m === 'boolean')
				f = window.confirm, k = m, m = a.shift();

			var v = this.element.data('title') || this.element.attr('title') || (this.element.attr('name') || 'field').toUpperCase();
			for (var i = 0; v !== undefined; ++i) {
				m = m.replace('{' + i + '}', v);
				v = a.shift();
			}

			return k === f(m) && this.element.trigger('focus') && true;
		},

		debug_: function() {
			if (this.debug) {
				const a = Array.prototype.slice.call(arguments);
				a.unshift(this.element.attr('name'));
				console.debug.apply(console, a);
			}
		},
		normalize_: function(v) {
			if (typeof v === 'string') {
				switch (this.element.css('text-transform')) {
					case 'uppercase': return v.toUpperCase();
					case 'lowercase': return v.toLowerCase();
					default         : return v;
				}
			}
			else if (v !== undefined && v != null)
				return v.toString();
			else
				return '';
		},
		triggerChangeIf_: function(b, t) {
			if (t === true || (b && t !== false)) {
				this.debug_('trigger(change)');
				this.element.trigger('change');
			}
		},
	};


	$.input = $.extend($.input, {
		'*': $.extend({ priority: -9 }, base),

		'SELECT': $.extend({ priority: -9 }, base, {
			get: function() {
				const e = this.element.get(0);
				if (e.selectedIndex >= 0) {
					const o = e.options[e.selectedIndex];
					return o.value || o.text;
				}
				else
					return null;
			},
			set: function(v, t) {
				const e = this.element.get(0);
				for (var i = 0; i < e.options.length; ++i) {
					if (v == (e.options[i].value || e.options[i].text)) {
						this.setIndex_(e, i, t);
						return;
					}
				}

				this.setIndex_(e, i, t);
			},

			setIndex_: function(e, i, t) {
				if (e.selectedIndex !== i) {
					e.selectedIndex = i;
					this.triggerChangeIf_(true, t);
				}
				else
					this.triggerChangeIf_(false, t);
			}
		}),

		'checkbox': $.extend({ priority: -9 }, base, {
			create: function(e) {
				this.element = e;
				this.element.on('click.input', function() { $(this).trigger('change'); });
			},
			destroy: function() {
				this.element.off('click.input');
				this.element = null;
			},
			get: function() {
				return this.element.prop('checked');
			},
			set: function(v, t) {
				if (this.element.prop('checked') != !!v) {
					this.element.prop('checked', !!v);
					this.triggerChangeIf_(true, t);
				}
				else
					this.triggerChangeIf_(false, t);
			}
		}),

		'radio': $.extend({ priority: -9 }, base, {
			create: function(e) {
				this.element = e;
				//this.element.on('click.input', function() { $(this).trigger('change'); });
			},
			destroy: function() {
				this.element.off('click.input');
				this.element = null;
			},
			get: function() {
				const e = $('input[type=radio][name=' + this.element.attr('name') + ']:checked', this.element.closest('.ui-dialog,body'));
				return e.length ? e.get(0).value : null;
				//return this.checked ? this.value : undefined;
			},
			set: function(v, t) {
				const checked = v == this.element.prop('value');
				if (this.element.prop('checked') != checked) {
					this.element.prop('checked', checked);
					this.triggerChangeIf_(true, t);
				}
				// else
				// 	this.triggerChangeIf_(false, t);
			}
		}),

		'date': $.extend({ priority: -5 }, base, {
			formatter: $.format.date('mm/dd/yy'),

			value_: '',
			length_: 6,
			editing_: false,
			savedValue_: null,

			create: function(e) {
				const self = this;

				self.element = e;
				self.length_ = e.attr('size') >= 10 ? 8 : 6;
				self.value_  = e.prop('value').replace(/[^\d]/g, '');

				self.element
					.css('text-align', 'center') // TODO: should be removed
					.on('click.input', function() {
						setTimeout(function() { self.element.select(); }, 0);
					})
					.on('focus.input', function() {
						self.savedValue_ = self.value_;
						self.editing_ = self.value_ && self.value_.length < self.length_; // if date is incomplete, start editing immediately
						self.element.select();
					})
					.on('blur.input', function() {
						if (self.value_.length > 0) {
							const d = new Date();
							if (d.parseMDY(self.value_) == Date.ERR_NONE) {
								if (self.value_.length < self.length_) {
									self.value_ = self.value_.substr(0, 4) + d.getFullYear();
									self.update_();
								}
							}
						}

						if (self.savedValue_ != self.value_)
							self.element.trigger('change');
						
						self.editing_ = false;
						self.savedValue_ = null;
					})
					.on('keydown.input', function(event) {
						if (!event.altKey && !event.ctrlKey && !event.metaKey && !self.element.prop('readonly')) {
							if ((event.which >= 0x30 && event.which <= 0x39) || (event.which >= 0x60 && event.which <= 0x69)) {
								self.startEditing_();

								if (self.value_.length < self.length_)
									self.value_ += String.fromCharCode((event.which & 0x0F) + 0x30);
							}
							else if (event.which == 0x08) { // Backspace
								self.startEditing_();

								if (self.value_.length > 0)
									self.value_ = self.value_.substr(0, self.value_.length - 1);
							}
							else if (event.which == 0x2E) { // Delete
								self.startEditing_();
								self.value_ = '';
							}
							else if(event.which < 0x20) {
								return;
							}

							event.stopPropagation();
							event.preventDefault();

							self.update_();
							self.element.select();
							self.element.trigger('input');
						}
					});

				self.validate(function(next) {
					if (self.value_ && self.get() == null)
						self.message('{0} must follow a pattern {1}.', 'MM/DD/YYYY'.substr(0, 2 + self.length_));
					else
						next();
				});

				self.update_();
			},
			destory: function() {
				this.element.off('.input');
				this.element = null;
			},
			get: function() {
				const a = /^(\d{2})(\d{2})(\d{2}(\d{2})?)$/.exec(this.value_);
				if (a) {
					var m = +a[1] - 1, d = +a[2], y = +a[3];

					if (this.value_.length < 8)
						y += 2000;

					const v = new Date();
					v.setFullYear(y, m, d);
					v.setHours(0);
					v.setMinutes(0);
					v.setSeconds(0);
					v.setMilliseconds(0);

					if (v.getTime() > Date.now() + 315360000000) // align century within 10 year gap
						v.setYear(y -= 100);

					if (y == v.getFullYear() && m == v.getMonth() && d == v.getDate())
						return v;
				}

				return null;
			},
			set: function(v, t) {
				if (v) {
					if (v instanceof Date) {
						const mm = (v.getMonth() + 101).toString().substring(1);
						const dd = (v.getDate()  + 100).toString().substring(1);
						const yy = (v.getFullYear()).toString().substring(8 - this.length_);

						v = mm + dd + yy;
					}
					else if (typeof v == 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) {
						const mm = v.substring(5, 7);
						const dd = v.substring(8, 10);
						const yy = v.substring(8 - this.length_, 4);

						v = mm + dd + yy;
					}
					else
						v = '';
				}
				else
					v = '';

				if (this.value_ !== v) {
					this.value_ = v;
					this.update_();
					this.triggerChangeIf_(true, t);
				}
				else
					this.triggerChangeIf_(false, t);
			},

			startEditing_: function() {
				if (!this.editing_) {
					this.editing_ = true;
					this.value_ = '';
				}
			},
			update_: function() {
				const v = (this.value_ + '----------').substring(0, this.length_);
				this.element.prop('value', v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4));
			}
		}),

		'money': $.extend({ priority: -5, debug: true }, base, {
			formatter: $.format.money(),

			value_: '',
			state_: 0,
			editing_: false,
			savedValue_: null,

			create: function(e) {
				const self = this;

				self.element = e;
				self.element
					.css('text-align', 'right') // TODO: should be removed
					.on('click.input', function() {
						setTimeout(function() { self.element.select(); }, 0);
					})
					.on('focus.input', function() {
						self.debug_('focus', self.value_);
						self.state_ = 0;
						self.editing_ = false;
						self.savedValue_ = self.value_;
						self.element.select();
					})
					.on('blur.input', function() {
						self.debug_('blur', self.value_, self.savedValue_);
						if (self.savedValue_ != self.value_)
							self.element.trigger('change');

						self.editing_ = false;
						self.savedValue_ = null;
					})
					.on('keydown.input', function(event) {
						if (!event.altKey && !event.ctrlKey && !event.metaKey && !self.element.prop('readonly')) {
							var vv = self.value_ || '';
							var ss = vv.charAt(0) == '-' ? -1 : 1;

							var dd = Math.floor(ss * vv / 100);
							var cc = ss * vv - 100 * dd;

							const startEditing = function(force) {
								if (!self.editing_ || force) {
									self.editing_ = true;
									self.state_ = 0; // initial state (empty)

									dd = cc = 0; ss = 1;
								}
							};

							if ((event.which >= 0x30 && event.which <= 0x39) || (event.which >= 0x60 && event.which <= 0x69)) {
								startEditing();

								const kk = event.which & 0x0F;
								switch (self.state_) {
									case 0: self.state_++;
									case 1: if (dd < 1000000) dd = 10 * dd + kk; break;
									case 2: cc = 10 * kk; self.state_++; break;
									case 3: cc = cc + kk; self.state_++; break;
								}
							}
							else if (event.which == 0x08) { // Backspace
								startEditing();

								switch (self.state_) {
									case 1: if (dd < 10) self.state_ = 0; dd = Math.floor(dd / 10); break;
									case 3: cc = 0; self.state_ = 1; break;
									case 4: cc = 10 * Math.floor(cc / 10); self.state_ = 3; break;
								}
							}
							else if(event.which == 0x2E) { // Delete
								startEditing(true);
							}
							else if((event.which == 0x6E || event.which == 0xBE) && self.state_ == 1) { // '.'
								startEditing();
								self.state_ = 2;
							}
							else if(event.which == 0x6D || event.which == 0xBD) { // '-'
								startEditing();
								self.state_ = Math.max(1, self.state_);
								ss = 0 - ss;
							}
							else if(event.which < 0x20) {
								return;
							}

							if (ss == -1 && dd == 0 && cc == 0)
								self.value_ = '-0'; // allow to start typing with '-' sign
							else if (self.state_ == 0)
								self.value_ = ''; // empty value
							else
								self.value_ = '' + ss * (100 * dd + cc);

							event.stopPropagation();
							event.preventDefault();

							self.update_();
							self.element.select();
							self.element.trigger('input');
						}
					});

				self.update_();
			},
			destroy: function() {
				this.element.off('.input');
				this.element = null;
			},
			get: function() {
				return this.value_.length ? +this.value_ : null;
			},
			set: function(v, t) {
				if (this.get() !== v) {
					this.value_ = typeof v === 'number' ? v.toFixed() : '';
					this.update_();
					this.triggerChangeIf_(true, t);
				}
				else
					this.triggerChangeIf_(false, t);
			},
			update_: function() {
				this.element.prop('value', this.value_ === '-0' ? '-' + this.format() : this.format());
			}
		}),

		'numeric': $.extend({ priority: -5 }, base, {
			create: function(e) {
				const self = this;

				self.element = e;
				self.element.on('keydown.input', function() {
					setTimeout(function() { self.set(self.get(), false); });
				});
			},
			destroy: function() {
				this.element.off('keydown.input');
				this.element = null;
			},
			get: function() {
				const v = this.element.prop('value') || '';
				return v.length ? +v : null;
			},
			set: function(v, t) {
				v = +v;
				v = isNaN(v) ? '' : v.toString();

				if (this.element.prop('value') !== v) {
					this.element.prop('value', v);
					this.triggerChangeIf_(true, t);
				}
				else
					this.triggerChangeIf_(false, t);
			}
		}),

		'dropdown': $.extend({ priority: -5, debug: true }, base, {
			source: function(type, term, resp) { resp([]); }, // must be overriden

			value_: { },
			focused_: false,

			create: function(e) {
				const self = this;
				const dropdownValidate = e.data('dropdownValidate') !== false;
				
				self.element = e;
				self.element
					.on('change.input', function() {
						self.debug_('change');
						if (self.focused_)
							self.set_value_(self.normalize_(self.element.prop('value')));
					})
					.on('update.input', function() {
						self.debug_('update');
						self.update_value_();
					})
					.on('focus.input', function() {
						self.debug_('focus');
						self.focused_ = true;
						self.update_();
					})
					.on('blur.input', function() {
						self.debug_('blur');
						self.focused_ = false;
						self.update_();
					})
					.autocomplete({
						delay: 1000,
						minLength: 0,
						autoFocus: false,

						source: function(req, res) {
							self.source.call(self, self.element.data('dropdown'), req.term, (data) => {
								const value = self.element.data('field') || 'code';
								$.each(data, function() { this.value = this[value]; });

								res(data);
							});
						},

						change: function() {
							self.debug_('autocomplete.change');
							self.element.trigger('change');
						},
						response: function(event, ui) {
							self.debug_('response', ui);

							const c = ui.content;
							if (c && c.length == 1 && self.element.prop('value')) {
								const v = self.normalize_(c[0].value);
								self.element.prop('value', v);
								self.set_value_(v, c[0]);
							}
						},
						select: function(event, ui) {
							self.debug_('select', ui);

							const v = self.normalize_(ui.item.value);
							self.element.prop('value', v);
							self.set_value_(v, ui.item);
							return false;
						}
					});

				$.extend(self.element.autocomplete('instance'), {
					_value: function() {
						if (arguments.length > 0)
							this.element.prop('value', arguments[0]);
						else
							return this.element.prop('value');
					},
					_renderItem: function(ul, item) {
						const i = function(c) {
							return $('<li></li>').append($('<div></div>').append(c)).appendTo(ul);
						};

						if (item.code !== undefined && item.desc !== undefined)
							return i(item.code + ' - ' + item.desc);
						else
							return i(item.label);
					}
				});
				
				self.validate(function(next) {
					if (dropdownValidate && !self.element.autocomplete('option', 'disabled')) {
						self.data().then(function(d) {
							const v = self.value_.value;
							const field = self.element.data('field');
							if ((!v && d == null) || (d && (d.value || d.code) == v) || (d && field && d[field] == v))
								next();
							else
								self.message('{0} contains invalid value.');
						});
					}
					else
						next();
				});

				self.set_value_('');
			},
			destroy: function() {
				this.element.off('.input').autocomplete('destroy');
				this.element = null;
			},
			enable: function(v) {
				this.element.autocomplete('enable');
			},
			disable: function(v) {
				this.element.autocomplete('disable');
			},
			get: function() {
				this.debug_('get');
				return this.normalize_(this.value_.value);
			},
			set: function(v, t) {
				this.debug_('set', v);

				v = this.normalize_(v);
				if (this.get() != v) {
					const self = this;

					self.element.prop('value', v);
					self.set_value_(v).then(function() {
						self.update_();
						self.triggerChangeIf_(true, t);
					});
				}
				else
					this.triggerChangeIf_(false, t);
			},
			callback: function(f) {
				this.source = function(type, term, resp) { f(term, resp); };
			},
			data: function() {
				this.debug_('data');
				return this.value_.promise;
			},
			format: function() {
				if (this.value_.data) {
					switch(this.element.data('format')) {
						case '1':
							return this.value_.data.code + ' - ' + this.value_.data.desc;
						case '2':
							return this.value_.data.desc;
					}
				}
				return this.value_.value;
			},

			update_: function() {
				this.debug_('update_');
				if (this.focused_)
					this.element.prop('value', this.value_.value);
				else
					this.element.prop('value', this.format());
			},
			set_value_: function(v, d) {
				if (this.value_.value != v) {
					this.debug_('set_value_', v, d);

					if (d || !v) {
						const o = { value: v, data: d || null };

						this.value_ = o;
						this.value_.promise = new Promise(function(resolve) { resolve(o.data); });
					}
					else {
						this.value_ = { value: v };
						this.update_value_();
					}
				}
				return this.value_.promise;
			},
			update_value_: function() {
				const self = this, o = this.value_;

				o.promise = new Promise(function(resolve) {
					self.source(self.element.data('dropdown') || '', o.value, function(c) {
						self.debug_('set_value_:response', o.value, c);
						
						const field = self.element.data('field');
						$.each(c, function() {
							if (o.value == (this.value || this.code) || (field && o.value == this[field])) { resolve(o.data = this); return false; }
						});

						o.data || resolve(null);
					});
				});
			}
		})
	});

	// --

	const input = function() {
		var t = null;

		const a = function() {
			const i = $.input[this];
			if (i && (!t || (t.priority || 0) < (i.priority || 0)))
				t = i;
		};

		if (this.className)
			$.each(this.className.split(/\s+/), a);

		if (this.tagName == 'INPUT')
			a.call(this.type || 'text');

		a.call(this.tagName);
		a.call('*');

		this.input = Object.create(t);
		this.input.create($(this).addClass('input'));

		return this.input;
	};

	$.fn.input = function() {
		const j = this;
		const m = arguments[0];
		const p = arguments[1];
		const a = Array.prototype.slice.call(arguments, 1);

		if (m === 'validate' && j.length > 1 && typeof p === 'function' && p.length == 0) {
			console.debug('validate', j[0].id);
			j.slice(0, 1).input(m, function() { j.slice(1).input(m, p); }); return j;
		}

		var r = undefined;
		j.each(function() {
			const i = this.input || input.call(this);
			if (m)
				r = i[m].apply(i, a);
			return r === undefined;
		});

		return r === undefined ? j : r;
	};

	// --

	const $_fn_val = $.fn.val;

	$.fn.val = function(v, t) {
		if (v === undefined) {
			this.each(function() {
				v = this.input ? this.input.get() : $_fn_val.call($(this));
				return v === undefined;
			});
			return v;
		}
		else {
			return this.each(function() {
				if (this.input)
					this.input.set(v, t);
				else if (this.tagName != 'BUTTON')
					$_fn_val.call($(this), v);
			});
		}
	};

	$.fn.getValue = function() {
		console.debug('jQuery.getValue() is deprecated');
		return this.val();
	};

	$.fn.setValue = function(v, t) {
		console.debug('jQuery.setValue() is deprecated');
		return this.val(v, t);
	};

	$(function() { $('input,select,textarea,.input').input(); });
})(jQuery);
