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
		sections_: null,
		sectionsHeight_: 0,

		_create: function() {
			const self = this;

			this._super();

			this.sections_ = $(this.options.header, this.element).addClass('g-slider-header')
				.each(function(index) {
					$(this)
						.attr('data-slider-index', index)
						.data('g-slider-header', {
							header: $(this).clone(),
							offset: self.sectionsHeight_
						});

					self.sectionsHeight_ += $(this).outerHeight();
				});

			this.top_ = $('<div class="g-slider-top"></div>').appendTo(this.element);
			this.bottom_ = $('<div class="g-slider-bottom"></div>').appendTo(this.element);
			this.hidden_ = $('<div class="g-slider-hidden"></div>').appendTo(this.element);

			this.element
				.addClass('g-slider')
				.on('click', '.g-slider-header', function() {
					const i = $(this).attr('data-slider-index');
					self.show(self.sections_.eq(+i));
				})
				.on('scroll resize update', function() {
					self.update();
				});

			this.update();
		},

		show: function(section) {
			const d = $(section).data('g-slider-header');
			const p = $(section).position();

			this.element.scrollTop(p.top - d.offset + this.element.scrollTop());
		},

		update: function() {
			const self = this;

			const scroll = this.element.scrollTop();
			const height = this.element.innerHeight();

			this.top_.empty().css('top', scroll + 'px');
			this.bottom_.empty().css('bottom', -scroll + 'px');
			
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
