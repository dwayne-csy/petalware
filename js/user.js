$(document).ready(function () {
    const baseUrl = 'http://192.168.100.9:4000/';
    const token = sessionStorage.getItem('token');
    

    // Register Form Submission
    $("#register").on('click', function (e) {
        e.preventDefault();
        let user = {
            name: $("#name").val(),
            email: $("#email").val(),
            password: $("#password").val(),
            contact_number: $("#contact_number").val() || null,
            address: $("#address").val() || null
        };

        $.ajax({
            method: "POST",
            url: `http://192.168.100.9:4000/api/v1/register`,
            data: JSON.stringify(user),
            processData: false,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            success: function (response) {
                Swal.fire({
                    icon: "success",
                    title: "Registration Successful",
                    text: "You can now login with your credentials",
                    position: 'bottom-right'
                }).then(() => {
                    window.location.href = 'login.html';
                });
            },
            error: function (error) {
                const errorMsg = error.responseJSON?.message || 'Registration failed';
                Swal.fire({
                    icon: "error",
                    title: "Registration Error",
                    text: errorMsg,
                    position: 'bottom-right'
                });
            }
        });
    });

    // Avatar Preview
    $('#profile_image').on('change', function () {
        const file = this.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                Swal.fire({
                    icon: "error",
                    text: "Image size should be less than 2MB",
                    position: 'bottom-right'
                });
                $(this).val('');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                $('#avatarPreview').attr('src', e.target.result).show();
            };
            reader.readAsDataURL(file);
        }
    });

    // Login Form Submission
$("#login").on('click', function (e) {
    e.preventDefault();
    let user = {
        email: $("#email").val(),
        password: $("#password").val()
    };
        $.ajax({
            method: "POST",
            url: `http://192.168.100.9:4000/api/v1/login`,
            data: JSON.stringify(user),
            processData: false,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            success: function (response) {
                Swal.fire({
                    icon: "success",
                    text: response.message || "Login successful",
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 1000,
                    timerProgressBar: true
                }).then(() => {
                    sessionStorage.setItem('token', response.token);
                    sessionStorage.setItem('user', JSON.stringify(response.user));
                    window.location.href = 'profile.html';
                });
            },
            error: function (error) {
                const errorMsg = error.responseJSON?.message || 'Login failed';
                Swal.fire({
                    icon: "error",
                    text: errorMsg,
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 1500,
                    timerProgressBar: true
                });
            }
        });
    });

    // Profile Update Form Submission
    $("#updateBtn").on('click', function (event) {
        event.preventDefault();
        
        const userData = JSON.parse(sessionStorage.getItem('user'));
        if (!userData || !userData.id) {
            Swal.fire({
                icon: "error",
                text: "Please login first",
                position: 'bottom-right'
            });
            return;
        }

        let formData = new FormData($('#profileForm')[0]);
        formData.append('userId', userData.id);

        $.ajax({
            method: "POST",
            url: `http://192.168.100.9:4000/api/v1/update-profile`,
            data: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            contentType: false,
            processData: false,
            dataType: "json",
            success: function (response) {
                Swal.fire({
                    icon: "success",
                    text: response.message || "Profile updated successfully",
                    position: 'bottom-right'
                }).then(() => {
                    // Update local user data
                    if (response.user) {
                        sessionStorage.setItem('user', JSON.stringify(response.user));
                    }
                    location.reload();
                });
            },
            error: function (error) {
                const errorMsg = error.responseJSON?.message || 'Profile update failed';
                Swal.fire({
                    icon: "error",
                    text: errorMsg,
                    position: 'bottom-right'
                });
            }
        });
    });

    // Account Deactivation
    $("#deactivateBtn").on('click', function (e) {
        e.preventDefault();
        
        const userData = JSON.parse(sessionStorage.getItem('user'));
        if (!userData || !userData.id) {
            Swal.fire({
                icon: "error",
                text: "Please login first",
                position: 'bottom-right'
            });
            return;
        }

        Swal.fire({
            title: "Are you sure?",
            text: "Your account will be deactivated!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, deactivate it!"
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    method: "POST",
                    url: `http://192.168.100.9:4000/api/v1/deactivate`,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    data: JSON.stringify({ userId: userData.id }),
                    processData: false,
                    contentType: 'application/json; charset=utf-8',
                    dataType: "json",
                    success: function (response) {
                        Swal.fire({
                            icon: "success",
                            text: response.message || "Account deactivated successfully",
                            position: 'bottom-right'
                        }).then(() => {
                            sessionStorage.clear();
                            window.location.href = 'index.html';
                        });
                    },
                    error: function (error) {
                        const errorMsg = error.responseJSON?.message || 'Deactivation failed';
                        Swal.fire({
                            icon: "error",
                            text: errorMsg,
                            position: 'bottom-right'
                        });
                    }
                });
            }
        });
    });

    // Load user profile data if on profile page
    if (window.location.pathname.includes('profile.html') && token) {
        $.ajax({
            method: "GET",
            url: `http://192.168.100.9:4000/api/v1/profile`,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            success: function (response) {
                if (response.user) {
                    // Populate form fields
                    $('#name').val(response.user.name);
                    $('#email').val(response.user.email);
                    $('#contact_number').val(response.user.contact_number || '');
                    $('#address').val(response.user.address || '');
                    
                    if (response.user.profile_image) {
                        $('#avatarPreview').attr('src', response.user.profile_image).show();
                    }
                }
            },
            error: function (error) {
                console.error("Profile load error:", error);
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }
});