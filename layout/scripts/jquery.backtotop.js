
//backtotop을 눌렀을 때 애니메이션을 0.6초 적용해 제일 위로올림
jQuery("#backtotop").click(function () {
    jQuery("body,html").animate({
        scrollTop: 0
    }, 600);
});
jQuery(window).scroll(function () {
    //스크롤 위치가 150이상이면 보이게하고 아니면 안보이기
    if (jQuery(window).scrollTop() > 150) {
        jQuery("#backtotop").addClass("visible");
    } else {
        jQuery("#backtotop").removeClass("visible");
    }
});