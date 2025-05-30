document.addEventListener("DOMContentLoaded", function () {
    if (typeof particlesJS !== "undefined") {
        particlesJS("particulas", {
            particles: {
                number: {
                    value: 8,
                    density: {
                        enable: true,
                        value_area: 800
                    }
                },
                color: {
                    value: ["#000000", "#ffffff"]
                },
                shape: {
                    type: "circle",
                },
                opacity: {
                    value: 1,
                    random: false
                },
                size: {
                    value: 3,
                    random: false
                },
                line_linked: {
                    enable: false,
                    distance: 150,
                    color: "#ffffff",
                    opacity: 0.4,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: "none",
                    random: false,
                    straight: false,
                    out_mode: "out"
                }
            },
            interactivity: {
                detect_on: "canvas",
                events: {
                    onhover: {
                        enable: true,
                        mode: "repulse"
                    },
                    onclick: {
                        enable: true,
                        mode: "push"
                    },
                    resize: true
                },
                modes: {
                    repulse: {
                        distance: 25,
                        duration: 1
                    },
                    grab: {
                        distance: 4,
                    },
                    push: {
                        particles_nb: 40
                    }
                }
            },
            retina_detect: true
        });
    } else {
        console.error("particlesJS não foi carregado.");
    }
});
