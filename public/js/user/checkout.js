document.addEventListener("DOMContentLoaded", function () {
  const submitOrder = document.getElementById("submitOrder");
  if (submitOrder) {
    submitOrder.addEventListener("click", async function (e) {
      e.preventDefault();
      const addressRadioButtons = document.querySelectorAll('input[name="address"]');
      let isAddressSelected = false;
      for (let i = 0; i < addressRadioButtons.length; i++) {
        if (addressRadioButtons[i].checked) {
          isAddressSelected = true;
          break;
        }
      }

      if (!isAddressSelected) {
        Swal.fire({
          icon: "warning",
          title: "Oops...",
          text: "Please add / select an address before placing the order!",
        });
        return;
      }

      // check if payment method is selected
      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
      if (!paymentMethod) {
        Swal.fire({
          icon: "warning",
          title: "Oops...",
          text: "Please select a payment method before placing the order!",
        });
        return;
      }

      // SweetAlert confirmation dialog
      Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, place the order!",
      }).then(async (result) => {
        if (result.isConfirmed) {
          // Existing code to handle form submission
          let form = document.getElementById("orderForm");
          if (form) {
            let formData = new FormData(form);
            const body = Object.fromEntries(formData);
            const paymentMethod = body.paymentMethod;
            console.log(body);
            try {
              // show loading using swal
              Swal.fire({
                title: "Please wait...",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                  Swal.showLoading();
                },
              });

              const response = await fetch("/place-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });

              Swal.close();

              console.log(response);
              const data = await response.json();

              console.log("Response data:", data);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              if(data.status){
                showRazorpay(data.order, data.user);
              }

              if (data.success) {
                Swal.fire({
                  icon: "success",
                  title: "Order Successfull",
                  text: data.message,
                }).then(() => {
                  location.assign("/order-success");
                });
              }
            } catch (error) {
              console.error("Fetch error:", error);
              Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "Everything is wrong !",
              });
            }
          } else {
            console.error("Form element not found");
          }
        }
      });
    });
  }
});

const showRazorpay = (order, user) => {
  console.log(order, user);

  var options = {
    key: "rzp_test_FGSvpGKo4JrSBW",
    amount: order.amount,
    currency: "INR",
    name: "Unbound",
    description: "Test Transaction",
    order_id: order.id, // Corrected 'orderId' to 'order_id' to match Razorpay's API
    handler: async function (response) {
      await verifyPayment(response); // Pass correct 'response'
    },
    prefill: {
      name: user.username,
      email: user.email,
      contact: user.phone,
    },
    notes: {
      address: "Razorpay Corporate Office",
    },
    theme: {
      color: "#2ade99",
    },
  };
  

  var rzp1 = new Razorpay(options);

  rzp1.open();
  rzp1.on("payment.failed", function (response) {
    swal.fire("Failed!", response.error.description, "error").then(() => {
      location.assign("/");
    });
  });
};

const verifyPayment = async (response) => {
  try {
    console.log("Verifying payment with response:", response);

    const res = await fetch("/user/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });

    const data = await res.json();
    console.log("Verification result:", data);

    if (data.success) {
      location.assign("/order-success");
    } else {
      swal.fire("Payment Verification Failed!", "Please try again.", "error").then(() => {
        location.assign("/");
      });
    }
  } catch (error) {
    console.error("Payment verification failed", error);
    swal.fire("Error!", "Payment verification could not be completed.", "error");
  }
};



// const debounce = (fn, delay = 50) => {
//   let timeoutId;
//   return (...args) => {
//     // cancel the previous timer
//     if (timeoutId) {
//       clearTimeout(timeoutId);
//     }
//     // setup a new timer
//     timeoutId = setTimeout(() => {
//       fn.apply(null, args);
//     }, delay);
//   };
// };

form.addEventListener(
  "input",
  debounce(function (e) {
    switch (e.target.id) {
      case "address-fn": // Assuming this is the full name field
        checkName();
        break;
      case "address-ph": // Assuming this is the phone number field
        checkPhone();
        break;
      case "address-house-name": // Assuming this is the house name field
        checkHouseName();
        break;
      case "address-area": // Assuming this is the area/street field
        checkAreaStreet();
        break;
      case "address-locality": // Assuming this is the locality field
        checkLocality();
        break;
      case "address-town": // Assuming this is the town field
        checkTown();
        break;
      case "address-state": // Assuming this is the state field
        checkState();
        break;
      case "address-zip": // Assuming this is the ZIP code field
        checkZipcode();
        break;
      case "address-landmark": // Assuming this is the landmark field
        checkLandmark();
        break;
      case "alternate-phone": // Assuming this is the alternate phone number field
        checkAlternatePhone();
        break;
      case "address_type": // Assuming this is the address type field
        checkAddressType();
        break;
      // Add more cases as needed for other fields in your form
    }
  })
);
