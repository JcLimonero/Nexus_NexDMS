import { Component } from "@angular/core";

import Swal from "sweetalert2";

@Component({
  selector: "app-sweet-alert",
  imports: [],
  templateUrl: "./sweet-alert.html",
  styleUrls: ["./sweet-alert.scss"],
})
export class SweetAlert {
  basicAlert() {
    Swal.fire("Any fool can use a computer");
  }

  withTitle() {
    Swal.fire("The Internet?", "That thing is still around?", "question");
  }

  withImage() {
    Swal.fire({
      imageUrl: "assets/nexus_images/logo/logo_full.png",
      imageHeight: 65,
      imageAlt: "A Endless Logo",
    });
  }

  error() {
    Swal.fire({
      title: "Oops...",
      text: "Something went wrong!",
      footer: "<a href>Why do I have this issue?</a>",
      icon: "warning",
    });
  }

  withCancelled() {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success",
        cancelButton: "btn btn-danger",
      },
      buttonsStyling: false,
    });
    swalWithBootstrapButtons
      .fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "No, cancel!",
        reverseButtons: true,
      })
      .then((result) => {
        if (result.value) {
          swalWithBootstrapButtons.fire(
            "Deleted!",
            "Your file has been deleted.",
            "success",
          );
        } else if (
          // Read more about handling dismissals
          result.dismiss === Swal.DismissReason.cancel
        ) {
          swalWithBootstrapButtons.fire(
            "Cancelled",
            "Your imaginary file is safe :)",
            "error",
          );
        }
      });
  }

  withConfirmation() {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.value) {
        Swal.fire("Deleted!", "Your file has been deleted.", "success");
      }
    });
  }

  autoClose() {
    let timerInterval: number | undefined;
    Swal.fire({
      title: "Auto close alert!",
      text: "just a wait! I will close in 30 second!",
      timer: 30000,
      timerProgressBar: true,
      confirmButtonColor: "var(--theme-deafult)",
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }

  withAjax() {
    Swal.fire({
      text: 'Search for a movie. e.g. "Herry Poter".',
      input: "text",
      confirmButtonText: "Search!",
    })
      .then((name) => {
        if (!name) throw null;
        return fetch(
          `https://itunes.apple.com/search?term=${name.value}&entity=movie`,
        );
      })
      .then((results) => {
        return results.json();
      })
      .then((json) => {
        const movie = json.results[0];
        const name = movie.trackName;
        const imageURL = movie.artworkUrl100;

        Swal.fire({
          title: "Top result:",
          text: name,
          imageUrl: imageURL,
        });
      })
      .catch((err) => {
        if (err) {
          Swal.fire("Oh noes!", "The AJAX request failed!", "error");
        } else {
          Swal.close();
        }
      });
  }

  rtl() {
    Swal.fire({
      title: "هل تريد الاستمرار؟",
      icon: "question",
      iconHtml: "؟",
      confirmButtonText: "نعم",
      cancelButtonText: "لا",
      showCancelButton: true,
      showCloseButton: true,
    });
  }

  customTimer() {
    let timerInterval: ReturnType<typeof setInterval> | undefined;
    Swal.fire({
      title: "Auto close alert!",
      html: "I will close in <b></b> milliseconds.",
      timer: 2000,
      timerProgressBar: true,

      didOpen: () => {
        Swal.showLoading();
        const popup = Swal.getPopup();
        const timer = popup ? popup.querySelector("b") : null;
        if (timer) {
          timerInterval = setInterval(() => {
            if (timer) {
              timer.textContent = `${Swal.getTimerLeft()}`;
            }
          }, 100);
        }
      },
      willClose: () => {
        if (timerInterval) clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
        console.warn("I was closed by the timer");
      }
    });
  }

  customHTML() {
    Swal.fire({
      title: "<strong>HTML <u>example</u></strong>",
      icon: "info",
      html:
        "You can use <b>bold text</b>, " +
        '<a href="//github.com">links</a> ' +
        "and other HTML tags",
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: '<i class="fa fa-thumbs-up"></i> Great!',
      confirmButtonAriaLabel: "Thumbs up, great!",
      cancelButtonText: '<i class="fa fa-thumbs-down"></i>',
      cancelButtonAriaLabel: "Thumbs down",
    });
  }

  animation() {
    Swal.fire({
      title: "Custom animation with Animate.css",
      animation: false,
      customClass: {
        container: "animated tada",
      },
    });
  }

  customPosition() {
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: "Your work has been saved",
      showConfirmButton: false,
      timer: 1500,
    });
  }

  customAlert() {
    Swal.fire({
      title: "Custom width, padding, background.",
      width: 600,
      padding: 100,
      background: "#fff url(assets/images/coming-soon-bg.jpg)",
      backdrop: `
            rgba(20, 72, 72, 0.48)
            center left
            no-repeat
          `,
      customClass: {
        container: "text-dark", // or any other class you want to apply
      },
    });
  }

  warning() {
    Swal.fire({
      icon: "warning",
      title: "Warning",
      text: "You clicked the button!",
      showConfirmButton: true,
    });
  }

  // A warning
  success() {
    Swal.fire({
      icon: "success",
      title: "Success",
      text: "You clicked the button!",
      showConfirmButton: true,
    });
  }

  // Info
  info() {
    Swal.fire({
      icon: "info",
      title: "Info",
      text: "You clicked the button!",
      showConfirmButton: true,
    });
  }

  // Danger
  danger() {
    Swal.fire({
      icon: "error",
      title: "Danger",
      text: "You clicked the button!",
      showConfirmButton: true,
    });
  }
}
