/**
 * @author Yuri Plaksyuk <yuri.plaksyuk@chestnutcorp.com>
 * @since Jun 6, 2020
 */
(function($) {

	$.widget('gears.color', {
		options: {
			palette: [
				'#ffffff', '#ff0000', '#00aa00', '#aa5500', '#0000aa', '#aa00aa', '#00aaaa', '#aaaaaa',
				'#555555', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#000000'
			],

			position: {
				my: 'right top',
				at: 'right bottom'
			},

			value: 0
		},

		palette_: null,


		_create: function() {
			const self = this;

			this._superApply(arguments);
			this.set(this.options.value, false);

			this.element.addClass('g-color')
				.on('click.g-color', function() {
					if (self.palette_ === null) {
						self.palette_ = $('<div class="g-color-palette">&nbsp;</div>')
							.on('click', '.g-color-value', function(event) {
								self.set($(this).index());
								self.hide();

								event.stopPropagation();
							});

						for (let v in self.options.palette) {
							$('<div class="g-color-value"></div>')
								.css('background-color', self.options.palette[v])
								.appendTo(self.palette_);
						}

						self.palette_.appendTo('body')
							.position($.extend({ of: $(this) }, self.options.position));
					}
					else
						self.hide();
				})
				.on('blur', function() {
					self.hide();
				});
		},

		_destroy: function() {
			this.element.removeClass('g-color')
				.off('.g-color');
		},

		hide: function() {
			if (this.palette_) {
				this.palette_.remove();
				this.palette_ = null;
			}
		},

		set: function(value, fireOnChange) {
			const v = this.normalizeValue_(value);
			if (v != this.get()) {
				this.element.val(v || '');

				if (fireOnChange !== false)
					this.element.trigger('change');
			}
			else {
				if (fireOnChange === true)
					this.element.trigger('change');
			}

			console.debug('g-color:set', v);
			this.element.css({ color: this.options.palette[v], backgroundColor: this.options.palette[v] });
		},

		get: function() {
			return this.normalizeValue_(+$(this.element).val());
		},

		normalizeValue_: function(v) {
			return v >= 0 && v < this.options.palette.length ? v : 0;
		}
	});
})(jQuery);
