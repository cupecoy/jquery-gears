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
		return $(currentScreen?.element);
	},

	getPreviousScreen: function() {
		return $(previousScreen?.element);
	}
};


$.widget('f.screen', {
	options: {
		title: false,
		active: null
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

	show: function () {
		const params = [...arguments];
		if (!currentScreen || currentScreen.hide()) {
			var screenSelector = '.' + this.widgetFullName + '-' + this.element.attr('id');
			$('.' + this.widgetFullName)
				.not(screenSelector).hide().end()
				.filter(screenSelector).show();
			if (typeof this.options.title === 'function')
				$('.' + this.widgetFullName + '-title').empty().append(this.options.title.call());
			else
				$('.' + this.widgetFullName + '-title').text(this.options.title);

			this.element.show();

			var self = this;
			managerButtons.each(function() {
				$(this).toggle(typeof self.options[this.id] === 'function');
			});

			$(this.options.active).trigger('focus');

			previousScreen = currentScreen;
			currentScreen = this;

			// hide all elements until screen is ready
			currentScreen._loading();
			// trigger show event and when it is done - mark screen as ready
			// use Promise.resolve to handle both sync and async results
			// in case of async - screen will be marked as ready when promise is resolved
			// in case of sync - screen will be marked as ready immediately
			// also, any errors will not prevent marking screen as ready

			debugger;
			const res = currentScreen._triggerHandler('show', undefined, params);
			if (res && typeof res?.always === 'function')
				res.always(() => currentScreen._ready());
			else
				currentScreen._ready();
		}
	},

	hide: function() {
		const active = this.active_();
		if (this._trigger('hide')) {
			this.options.active = active && active.trigger('blur');
			return true;
		}
		else
			return false;
	},

	back: function() {
		this._trigger('back');
	},

	next: function() {
		this._trigger('next');
	},

	trigger: function() {
		this._trigger.apply(this, arguments);
	},

	active_: function() {
		const active = $(document.activeElement).filter(':input');
		return active.parents('.' + this.widgetFullName + '-canvas').index(this.element) > -1 ? active : null;
	},

	_loading: function() {
		this.element.removeClass(this.widgetFullName + '--ready');

		this.element.addClass(this.widgetFullName + '--loading');

		const loader = $(`<div class="${this.widgetFullName}__loader"></div>`).html('<div></div>'.repeat(12));
		this.element.append(loader);
	},

	_ready: function() {
		const loader = this.element.find(`.${this.widgetFullName}__loader`);
		loader.remove()

		this.element.removeClass(this.widgetFullName + '--loading');

		this.element.addClass(this.widgetFullName + '--ready');
	},

	_triggerHandler: function(type, event, data) {
		let callback = this.options[type];

		if (callback && typeof callback === "function") {
			const result = callback.call(this.element[0], event, ...data);
			if (result !== undefined) {
				return result;
			}
		}

		event = $.Event(event);
		event.type = (type === null ? "" : type.toLowerCase());

		return this.element.triggerHandler(event, data);
	}
});

} ( jQuery ));

