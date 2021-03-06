(function(root, factory) {
	if(typeof define === "function" && define.amd) {
		define(["jquery"], function(jquery){
			return (root.LightCarousel = factory(jquery));
		});
	} else if(typeof module === "object" && module.exports) {
		module.exports = (root.LightCarousel = factory(require("jquery")));
	} else {
		root.LightCarousel = factory(root.jQuery);
	}
}(this, function($) {
	function LightCarousel(wrapper, options) {
		this.options = $.extend(true, {
			animationSpeed: 500,
			selectors: {
				collectionWrapper: 'ul',
				leftBtn: '.lc-arrow-left',
				rightBtn: '.lc-arrow-right',
				scrollbarTrack: '.lc-scrollbar-track'
			}
		}, options);

		// ELEMENTS
		if (wrapper instanceof $) {
			this.wrapper = wrapper;
		} else {
			this.wrapper = $(wrapper);
		}

		this.carousel = this.wrapper.find(this.options.selectors.collectionWrapper).eq(0);
		this.collection = this.carousel.children();

		this.leftArrow = this.wrapper.find(this.options.selectors.leftBtn);
		this.rightArrow = this.wrapper.find(this.options.selectors.rightBtn);


		this.thumbTrack = this.wrapper.find(this.options.selectors.scrollbarTrack);
		this.thumb = this.thumbTrack.children();

		// STATE
		this.currentOffset = 0;
		this.currentThumbOffset = 0;
		this.lastWrapperWidth = this.wrapper.width();
	}

	// SETUP PART

	LightCarousel.prototype.setup = function() {
		this.setupStyles();
		this.bindListeners();
	}

	LightCarousel.prototype.setupStyles = function() {
		this.wrapper.addClass('lc-wrapper');
		this.carousel.addClass('lc-carousel');
		this.collection.addClass('lc-carousel-item');
		this.thumbTrack.addClass('lc-scrollbar');
		this.thumb.addClass('lc-scrollbar-thumb');

		var wrapperPaddingTop = parseInt( this.wrapper.css('padding-top') );
		wrapperPaddingTop = isNaN(wrapperPaddingTop) ? 0 : wrapperPaddingTop;

		var carouselMarginTop = parseInt ( this.carousel.css('margin-top') );
		carouselMarginTop = isNaN(carouselMarginTop) ? 0 : carouselMarginTop;

		var arrowTop = Math.floor( this.carousel.outerHeight() / 2 - this.leftArrow.outerHeight() / 2 + wrapperPaddingTop + carouselMarginTop );
		this.leftArrow.css('top', arrowTop);
		this.rightArrow.css('top', arrowTop);
	}

	LightCarousel.prototype.bindListeners = function() {
		this.leftArrow.on('click', $.proxy(this.produceButtonOffset, this));
		this.rightArrow.on('click', $.proxy(this.produceButtonOffset, this));
		this.thumb.on('mousedown', $.proxy(this.produceScrollbarOffset, this));

		$(window).on('resize', $.proxy(this.handleResize, this));
	}

	LightCarousel.prototype.destroy = function() {
		this.unbindListeners();
		this.removeStyles();

		this.options = null;
		this.wrapper = null;
		this.carousel = null;
		this.collection = null;
		this.leftArrow = null;
		this.rightArrow = null;
		this.thumbTrack = null;
		this.thumb = null;
		this.currentOffset = null;
		this.currentThumbOffset = null;
		this.lastWrapperWidth = null;
	}

	LightCarousel.prototype.unbindListeners = function() {
		this.leftArrow.off('click');
		this.rightArrow.off('click');
		this.thumb.off('mousedown');
		$(window).off('resize');
	}

	LightCarousel.prototype.removeStyles = function() {
		this.wrapper.removeClass('lc-wrapper');
		this.carousel.removeClass('lc-carousel');
		this.collection.removeClass('lc-carousel-item');
		this.thumbTrack.removeClass('lc-scrollbar');
		this.thumb.removeClass('lc-scrollbar-thumb');
	}

	// LISTENERS

	LightCarousel.prototype.produceButtonOffset = function(e) {
		e.preventDefault();

		if ( this.carousel.is(':animated') ) {
			return;
		}

		var carouselOffset = 0,
			thumbOffset = 0;

		if ( $(e.currentTarget).hasClass('lc-arrow-left') ) {
			carouselOffset = this.calcLeftOffset();
		} else {
			carouselOffset = this.calcRightOffset();
		}

		thumbOffset = this.calcThumbOffsetByCarouselOffset(carouselOffset);

		this.animateButtonOffset(carouselOffset, thumbOffset);
	}

	LightCarousel.prototype.produceScrollbarOffset = function(eDown) {
		var self = this,
			thumbCursorOffset = eDown.pageX - this.wrapper.offset().left - this.currentThumbOffset;

		$(document).on('mousemove', function(eMove) {
			var position = eMove.pageX - self.wrapper.offset().left - thumbCursorOffset;

			self.changeThumbPosition(position);

			var percent = self.calcThumbPercentPosition();
			var carouselOffset = self.calcCarouselOffsetByPercent(percent);

			self.moveCarousel(carouselOffset);
		});

		$(document).on('mouseup', function() {
			$(document).off('mousemove mouseup');
		});
	}

	LightCarousel.prototype.handleResize = function(e) {
		this.produceCarouselOffsetOnResize();

		var thumbOffset = this.calcThumbOffsetByCarouselOffset(this.currentOffset);
		this.lastWrapperWidth = this.wrapper.width();

		this.moveThumb(thumbOffset);
	}

	LightCarousel.prototype.produceCarouselOffsetOnResize = function() {
		// When we should move carousel?
		// 1) If carousel width > wrapper width:
		//  - If current offset was positive -> set offset = 0
		//  - When we hit the right border of carousel -> increase offset on resize length
		// 2) If carousel width < wrapper width:
		//  - If current offset was negative -> set offset = 0
		//  - If current offset was positive:
		//    - If wrapper became smaller -> decrease offset on resize length (untill it become 0)

		var offset;

		if (this.carousel.width() > this.wrapper.width()) {

			if (this.currentOffset > 0) {
				this.moveCarousel(0);
			} else if (this.wrapper.width() - this.currentOffset > this.carousel.width()) {
				offset = this.calcCarouselOffsetOnResize();
				this.moveCarousel(offset);
			}

		} else {

			if (this.currentOffset < 0) {
				this.moveCarousel(0);
			} else {
				if (this.lastWrapperWidth > this.wrapper.width()) {
					offset = this.calcCarouselOffsetOnResize();

					if (offset > 0) {
						this.moveCarousel(offset);
					} else {
						this.moveCarousel(0);
					}

				}
			}

		}

	}

	// CALCULATIONS

	LightCarousel.prototype.calcLeftOffset = function() {
		var intersection = this.currentOffset + this.wrapper.width(),
			offset = 0,
			currentOffset = this.currentOffset;

		if (intersection >= 0) {
			return offset;
		}

		this.collection.each(function() {
			offset -= this.offsetWidth;

			if (offset <= intersection) {
				// if intersection points to the same element
				if (offset === currentOffset) {
					offset += this.offsetWidth
				}

				return false;
			}
		});

		return offset;
	}

	LightCarousel.prototype.calcRightOffset = function() {
		var intersection = 2 * this.wrapper.width() - this.currentOffset,
			offset = 0,
			currentOffset = this.currentOffset;

		if (intersection >= this.carousel.width()) {
			return this.wrapper.width() - this.carousel.width();
		}

		intersection = this.currentOffset - this.wrapper.width();

		this.collection.each(function() {
			offset -= this.offsetWidth;

			if (offset <= intersection) {
				if (offset + this.offsetWidth !== currentOffset) {
					offset += this.offsetWidth;
				}

				return false;
			}
		});

		return offset;
	}

	LightCarousel.prototype.calcCarouselOffsetByPercent = function(percent) {
		return - Math.floor( ( this.carousel.width() - this.wrapper.width() ) * percent );
	}

	LightCarousel.prototype.calcThumbOffsetByCarouselOffset = function(offset) {
		var percent = Math.floor( Math.abs(offset / ( this.carousel.width() - this.wrapper.width() ) ) * 100 ) / 100;
		var pos = Math.floor( (this.thumbTrack.width() - this.thumb.width()) * percent );

		return pos;
	}

	LightCarousel.prototype.calcThumbPercentPosition = function() {
		return Math.floor( this.currentThumbOffset / ( this.thumbTrack.width() - this.thumb.width() ) * 100 ) / 100;
	}

	LightCarousel.prototype.calcCarouselOffsetOnResize = function() {
		return this.currentOffset + this.wrapper.width() - this.lastWrapperWidth;
	}

	// ANIMATORS

	LightCarousel.prototype.animateButtonOffset = function(carouselOffset, thumbOffset) {
		if ( carouselOffset !== this.currentOffset ) {
			this.carousel.animate({
				left: carouselOffset
			}, this.options.animationSpeed);

			this.animateThumbMovement(thumbOffset);

			this.currentOffset = carouselOffset;
		} else {
			if (carouselOffset === 0) {
				this.carousel
					.animate({
						left: "+=40"
					}, this.options.animationSpeed / 2)
					.animate({
						left: "-=40"
					}, this.options.animationSpeed / 2);
			} else {
				this.carousel
					.animate({
						left: "-=40"
					}, this.options.animationSpeed / 2)
					.animate({
						left: "+=40"
					}, this.options.animationSpeed / 2);
			}
		}
	}

	LightCarousel.prototype.changeThumbPosition = function(position) {
		if (position < 0) {
			this.moveThumb(0);
		} else if (position > this.thumbTrack.width() - this.thumb.width()) {
			position = this.thumbTrack.width() - this.thumb.width();
			this.moveThumb(position)
		} else {
			this.moveThumb(position)
		}
	}

	LightCarousel.prototype.moveCarousel = function(offset) {
		this.carousel.css('left', offset);
		this.currentOffset = offset;
	}

	LightCarousel.prototype.animateThumbMovement = function(offset) {
		this.thumb.animate( {left : offset}, this.options.animationSpeed );
		this.currentThumbOffset = offset;
	}

	LightCarousel.prototype.moveThumb = function(offset) {
		this.thumb.css('left', offset);
		this.currentThumbOffset = offset;
	}

	return LightCarousel;
}));
