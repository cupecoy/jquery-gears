(function( $ ) {

var managerButtons,
	currentScreen,
	previousScreen;

$.screen = {
	back: function() {
		managerButtons.filter('[id=back]:visible').first().click();
	},

	next: function() {
		managerButtons.filter('[id=next]:visible,[id=finish]:visible').first().click();
	},

	enableKeys: function() {
		$('body').on('keydown.screen', function(event) {
			if (!event.isDefaultPrevented()) {
				if (event.which == $.ui.keyCode.ENTER) {
					event.stopPropagation();

					$.screen.next();
					return false;
				}

				if (event.which == $.ui.keyCode.ESCAPE) {
					event.stopPropagation();

					$.screen.back();
					return false;
				}
			}

			return null;
		});

	},

	disableKeys: function() {
		$('body').off('keydown.screen');
	},

	getCurrentScreen: function() {
		return $(currentScreen.element);
	},

	getPreviousScreen: function() {
		return $(previousScreen.element);
	}
};


$.widget('f.screen', {
	options: {
		title: false
	},

	_create: function() {
		if (!managerButtons) {
			managerButtons = $('.' + this.widgetFullName + '-button:button');
			managerButtons.on('click.screen', function() {
				currentScreen._trigger(this.id);
			});

			$.screen.enableKeys();
		}
		
		this.options.title = this.options.title || this.element.attr('title');
		this.element.removeAttr('title');

		this.element
			.addClass(this.widgetFullName)
			.addClass(this.widgetFullName + '-canvas')
			.hide();
	},

	show: function() {
		if (!currentScreen || currentScreen._trigger('hide')) {
			var screenSelector = '.' + this.widgetFullName + '-' + this.element.attr('id');
			$('.' + this.widgetFullName)
				.not(screenSelector).hide().end()
				.filter(screenSelector).show();
			if ($.isFunction(this.options.title))
				$('.' + this.widgetFullName + '-title').empty().append(this.options.title.call());
			else
				$('.' + this.widgetFullName + '-title').text(this.options.title);

			this.element.show();

			var self = this;
			managerButtons.each(function() {
				if ($.isFunction(self.options[this.id]))
					$(this).show();
				else
					$(this).hide();
			});

			previousScreen = currentScreen;
			currentScreen = this;
			currentScreen._trigger('show');
		}
	},

	back: function() {
		this._trigger('back');
	},

	next: function() {
		this._trigger('next');
	}
});

} ( jQuery ));

