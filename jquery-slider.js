// /**
//  * @author Michael Plaksyuk <mplaksyuk@chestnutcorp.com>
//  * @since Aug 8, 2023
//  */

(function($) {
	'use strict';

	$.widget('gears.slider', {
		options: {
			header: '> :nth-child(odd)',
			behavior: 'smooth',
			beforeShow: function () { },
			afterShow: function () { },
		},

		slider_: null,

		_create: function() {
			const self = this;
			this._super();

			this.slider_ = this.element.addClass('g-slider');

			const observer = new ResizeObserver(entries => { //on change size of element 
				this.update();
            });

			$(this.options.header, this.slider_).on('click', function (event) {
				self.options.beforeShow.apply(this, [event, self.slider_]);
			}).on('click', function (event) {
				const beforeScrollTop = self.slider_.scrollTop();
				const afterScrollTop = self.show(this);

				if (afterScrollTop > beforeScrollTop && self.slider_.get(0).scrollHeight - self.slider_.outerHeight() <= beforeScrollTop) {
					event.scrollDistance = 0;
				}
				else {
					event.scrollDistance = Math.floor(Math.abs(beforeScrollTop - afterScrollTop));
				}

				self.options.afterShow.apply(this, [event, self.slider_]);
			}).each(function() {
                observer.observe(this);
            });
		},

		show: function (header) {
			const self = this;

			const scrollTop = $(header).prevAll().not('.g-slider-header').get().reduce((acc, prev) => {
				if($(prev).is(':visible'))
					acc += $(prev).outerHeight();
				return acc;
			}, 0);
			
			self.slider_.get(0).scrollTo({
				top: scrollTop,
				behavior: self.options.behavior,
			});

			return scrollTop;
		},

		update: function () {
			const self = this;
			const calculateOffset_y = (headers) => {
				return Math.floor(headers.get().reduce((acc, header) => {
					return acc + $(header).outerHeight();
				}, 0));
			};

			$(this.options.header, this.slider_).addClass('g-slider-header').each(function() {
				const prevHeaders = $(this).prevAll('.g-slider-header');
				const top = calculateOffset_y(prevHeaders);
				$(this).css('top', top);
				
				const nextHeaders = $(this).nextAll('.g-slider-header');
				const bottom = calculateOffset_y(nextHeaders);
				$(this).css('bottom', bottom);
			});
		}
	});
})(jQuery);

