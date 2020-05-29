/**
 * @author Yuri Plaksyuk <yuri.plaksyuk@chestnutcorp.com>
 * @since May 25, 2020
 */
(function($) {
	'use strict';

	$.widget('gears.slider', {
		options: {
			header: '> :nth-child(odd)'
		},

		top_: null,
		bottom_: null,
		hidden_: null,
		canvas_: null,
		sections_: null,
		sectionsHeight_: 0,

		_create: function() {
			const self = this;

			this._super();

			this.element.addClass('g-slider');

			this.canvas_ = $('<div class="g-slider-canvas"></div>')
				.on('scroll resize', function() { self.update(); })
				.append(this.element.children())
				.appendTo(this.element)

			this.top_ = $('<div class="g-slider-top"></div>').appendTo(this.element);
			this.bottom_ = $('<div class="g-slider-bottom"></div>').appendTo(this.element);
			this.hidden_ = $('<div class="g-slider-hidden"></div>').appendTo(this.element);

			this.sections_ = $(this.options.header, this.canvas_).addClass('g-slider-header')
				.each(function(index) {
					$(this)
						.on('click', function() {
							self.show(self.sections_.eq(index));
						})
						.data('g-slider-header', {
							header: $(this).clone(true),
							offset: self.sectionsHeight_
						});

					self.sectionsHeight_ += $(this).outerHeight();
				});

			this.update();
		},

		show: function(section) {
			const d = $(section).data('g-slider-header');
			const p = $(section).position();

			this.canvas_.scrollTop(p.top - d.offset + this.canvas_.scrollTop());
		},

		update: function() {
			const self = this;

			const scroll = this.canvas_.scrollTop();
			const height = this.canvas_.innerHeight();

			this.sections_.each(function() {
				const d = $(this).data('g-slider-header');
				const p = $(this).position();

				if (p.top < d.offset)
					self.top_.append(d.header);
				else if (p.top > height - self.sectionsHeight_ + d.offset)
					self.bottom_.append(d.header);
				else
					self.hidden_.append(d.header);
			});
		}
	});
})(jQuery);
