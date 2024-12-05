// /**
//  * @author Michael Plaksyuk <mplaksyuk@chestnutcorp.com>
//  * @since Feb 23, 2024
//  */

(function($) {
	'use strict';
	/**
	 * Setter and getter
	 * @param {object|undefined} items
	 * @returns {block|items}
	 */
	const __items = function (items) {
		const data = this.data('block');
		if (items === undefined)
			return $(data.items, this);

		data.items = items;

		return this;
	};

	/**
	 * Setter
	 * @param {object} instances
	 * @returns {block}
	 */
	const __instances = function (instances) {
		if (instances === undefined)
			return this;

		const data = this.data('block');

		data.instances = Object.setPrototypeOf(instances, data.instances);

		return this;
	};

	/**
	 * find Item by data-name attibute or name attribute
	 * @param {Array} items
	 * @param {String} name
	 */
	const findItemByName = (items, name) => {
		let item;

		//find by data-name
		items.each(function () {
			if ($(this).data('name') === name) {
				item = $(this);
				return false;
			}
		});

		if (item !== undefined)
			return item;
		//find by name
		return items.filter(`[name=${name}]`);
	};

	const getItemName = (item) => {
		return $(item).data('name') ?? $(item).attr('name');
	};

	const __create = function () {
		$(this).data('block', {
			items: '.block__item',
			instances: {
				set: function (data, triggerEvents) {
					const items = this.block('items');

					$.each(data, function (name, value) {
						const item = findItemByName(items, name);
						if (item.is('.money')) value = +value;
						item.val(value, triggerEvents);
					});
				},
				fetch: function () {
					const items = this.block('items');

					return items.get().reduce(function (acc, item) {
						const name = getItemName(item);
						const value = $(item).val();
						acc[name] = value;

						return acc;
					}, {});
				},
				get: function () {

				},
				clear: function (triggerEvents) {
					const items = this.block('items');

					items.val(null, triggerEvents);

					items.filter('[checked]').each(function () {
						const value = this.value;
						$(this).val(value, triggerEvents);
					});
				}
			}
		});
	};

	const FUNCTIONS = { //this functions returns jquery elements
		items: __items,
		instances: __instances
	};

	$.fn.block = function () {
		const e = this;
		const m = arguments[0];
		const p = Array.prototype.slice.call(arguments, 1);

		let r;

		e.each(function () {
			const self = $(this);

			let data = self.data('block');
			if (!data)
				__create.apply(self);

			if ($.isPlainObject(m)) {
				const { items, instances } = m;

				if (items !== undefined) {
					const a = __items.apply(self, [items]);
					r = $(r).add(a); // TODO: find another solution to collect results
				}

				if (instances !== undefined && $.isPlainObject(instances)) {
					const a = __instances.apply(self, [instances]);
					r = $(r).add(a);
				}

				if (instances === undefined && items === undefined) {
					const a = __instances.apply(self, [m]);
					r = $(r).add(a);
				}

				return;
			}
			else if (m !== undefined) {
				data = self.data('block');

				if (FUNCTIONS[m]) {
					const a = FUNCTIONS[m].apply(self, p);
					r = $(r).add(a);
				}
				else if (data.instances[m]) {
					self.trigger(`block:${m}`, p);

					const a = data.instances[m].apply(self, p);

					if ($.isPlainObject(a))
						r = { ...(r || {}), ...a };
					else
						r = a;
				}
				else if (data[m] !== undefined) {
					return data[m];
				}
				else
					r = undefined;
			}
			else {
				r = $(r).add(self);
			}
		});

		return r;
	};

})(jQuery);

