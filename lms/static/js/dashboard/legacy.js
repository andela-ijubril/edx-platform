/**
 * Legacy JavaScript for the student dashboard.
 * Please do not add anything else to this file unless
 * you have an extremely good reason.  New JavaScript
 * for the dashboard should be implemented as self-contained
 * modules with unit tests.
 */
 var edx = edx || {};

(function($, gettext, Logger, accessibleModal, interpolate) {
    'use strict';

    edx.dashboard = edx.dashboard || {};
    edx.dashboard.legacy = {};

    /**
     * Initialize the dashboard using legacy JavaScript.
     *
     * @param{Object} urls - The URLs used by the JavaScript,
     *     which are generated by the server and passed into
     *     this function by the rendered page.
     *
     *     Specifically:
     *         - dashboard
     *         - signInUser
     *         - changeEmailSettings
     *         - verifyToggleBannerFailedOff
     */
    edx.dashboard.legacy.init = function(urls) {

        var notifications = $('.dashboard-notifications'),
            upgradeButtonLinks = $('.action-upgrade'),
            verifyButtonLinks = $('.verification-cta > .cta');

        // On initialization, set focus to the first notification available for screen readers.
        if ( notifications.children().length > 0 ) {
            notifications.focus();
        }

        $('.action-more').bind('click', toggleCourseActionsDropdown);

        // Track clicks of the upgrade button. The `trackLink` method is a helper that makes
        // a `track` call whenever a bound link is clicked. Usually the page would change before
        // `track` had time to execute; `trackLink` inserts a small timeout to give the `track`
        // call enough time to fire. The clicked link element is passed to `generateProperties`.
        window.analytics.trackLink(upgradeButtonLinks, 'edx.bi.dashboard.upgrade_button.clicked', generateProperties);

        // Track clicks of the "verify now" button.
        window.analytics.trackLink(verifyButtonLinks, 'edx.bi.user.verification.resumed', generateProperties);

        // Track clicks of the LinkedIn "Add to Profile" button
        window.analytics.trackLink(
            $('.action-linkedin-profile'),
            'edx.bi.user.linkedin_add_to_profile',
            function( element ) {
                var $el = $( element );
                return {
                    category: 'linkedin',
                    label: $el.data('course-id'),
                    mode: $el.data('certificate-mode')
                };
            }
        );


        // Generate the properties object to be passed along with business intelligence events.
        function generateProperties(element) {
            var $el = $(element),
                properties = {};

            if ( $el.hasClass('action-upgrade') ) {
                properties.category = 'upgrade';
            } else if ( $el.hasClass('cta') ) {
                properties.category = 'verification';
            }

            properties.label = $el.data('course-id');

            return properties;
        }

        function toggleCourseActionsDropdown(event) {
            var dashboard_index = $(this).data('dashboard-index');

            // Toggle the visibility control for the selected element and set the focus
            var dropdown_selector = 'div#actions-dropdown-' + dashboard_index;
            var dropdown = $(dropdown_selector);
            dropdown.toggleClass('is-visible');
            if (dropdown.hasClass('is-visible')) {
                dropdown.attr('tabindex', -1);
            } else {
                dropdown.removeAttr('tabindex');
            }

            // Inform the ARIA framework that the dropdown has been expanded
            var anchor_selector = 'a#actions-dropdown-link-' + dashboard_index;
            var anchor = $(anchor_selector);
            var aria_expanded_state = (anchor.attr('aria-expanded') === 'true');
            anchor.attr('aria-expanded', !aria_expanded_state);

            // Suppress the actual click event from the browser
            event.preventDefault();
        }

        $("#failed-verification-button-dismiss").click(function() {
            $.ajax({
                url: urls.verifyToggleBannerFailedOff,
                type: "post"
            });
            $("#failed-verification-banner").addClass('is-hidden');
        });

        $("#upgrade-to-verified").click(function(event) {
            var user = $(event.target).closest(".action-upgrade").data("user"),
                course = $(event.target).closest(".action-upgrade").data("course-id");

            Logger.log('edx.course.enrollment.upgrade.clicked', [user, course], null);
        });

        $(".action-email-settings").click(function(event) {
            $("#email_settings_course_id").val( $(event.target).data("course-id") );
            $("#email_settings_course_number").text( $(event.target).data("course-number") );
            if($(event.target).data("optout") === "False") {
                $("#receive_emails").prop('checked', true);
            }
        });

        $(".action-unenroll").click(function(event) {
            var element = $(event.target);
            var track_info = element.data("track-info");
            var course_number = element.data("course-number");
            var course_name = element.data("course-name");
            var cert_name_long = element.data("cert-name-long");
            $('#track-info').html(interpolate(track_info, {
                course_number: "<span id='unenroll_course_number'>" + course_number + "</span>",
                course_name: "<span id='unenroll_course_name'>" + course_name + "</span>",
                cert_name_long: "<span id='unenroll_cert_name'>" + cert_name_long + "</span>"
            }, true));
            $('#refund-info').html( element.data("refund-info") );
            $("#unenroll_course_id").val( element.data("course-id") );
        });

        $('#unenroll_form').on('ajax:complete', function(event, xhr) {
            if(xhr.status === 200) {
                location.href = urls.dashboard;
            } else if (xhr.status === 403) {
                location.href = urls.signInUser + "?course_id=" +
                encodeURIComponent($("#unenroll_course_id").val()) + "&enrollment_action=unenroll";
            } else {
                $('#unenroll_error').html(
                    xhr.responseText ? xhr.responseText : gettext("An error occurred. Please try again later.")
                ).stop().css("display", "block");
            }
        });

        $("#email_settings_form").submit(function(){
            $.ajax({
                type: "POST",
                url: urls.changeEmailSettings,
                data: $(this).serializeArray(),
                success: function(data) {
                    if(data.success) {
                        location.href = urls.dashboard;
                    }
                },
                error: function(xhr) {
                    if (xhr.status === 403) {
                        location.href = urls.signInUser;
                    }
                }
            });
            return false;
        });


        $(".action-email-settings").each(function(index){
            $(this).attr("id", "email-settings-" + index);
            // a bit of a hack, but gets the unique selector for the modal trigger
            var trigger = "#" + $(this).attr("id");
            accessibleModal(
                trigger,
                "#email-settings-modal .close-modal",
                "#email-settings-modal",
                "#dashboard-main"
            );
        });

        $(".action-unenroll").each(function(index){
            $(this).attr("id", "unenroll-" + index);
            // a bit of a hack, but gets the unique selector for the modal trigger
            var trigger = "#" + $(this).attr("id");
            accessibleModal(
                trigger,
                "#unenroll-modal .close-modal",
                "#unenroll-modal",
                "#dashboard-main"
            );
        });

        $("#unregister_block_course").click( function(event) {
            $("#unenroll_course_id").val($(event.target).data("course-id"));
            $("#unenroll_course_number").text($(event.target).data("course-number"));
            $("#unenroll_course_name").text($(event.target).data("course-name"));
        });
    };

})(jQuery, gettext, Logger, accessible_modal, interpolate); // jshint undef:false
