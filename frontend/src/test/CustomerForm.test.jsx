import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomerForm } from "../features/customers/CustomerForm";
import * as AuthContextModule from "../context/AuthContext";
import * as ToastContextModule from "../context/ToastContext";
import * as CustomersApi from "../api/customers";

describe("CustomerForm component", () => {
  it("renders form fields and submits new customer", async () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      auth: { username: "teller", password: "123" },
    });

    const setError = vi.fn();
    const setSuccess = vi.fn();
    vi.spyOn(ToastContextModule, "useToast").mockReturnValue({
      setError,
      setSuccess,
    });

    const createCustomerSpy = vi
      .spyOn(CustomersApi, "createCustomer")
      .mockResolvedValue({ id: "cust-1", name: "Alice", email: "alice@example.com" });

    const onCustomerCreated = vi.fn();

    render(<CustomerForm onCustomerCreated={onCustomerCreated} />);

    const nameInput = screen.getByPlaceholderText(/Ramesh Kumar/i);
    const emailInput = screen.getByPlaceholderText(/ramesh@example.com/i);
    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    const aadhaarInput = screen.getByPlaceholderText(/1234 5678 9012/i);
    const panInput = screen.getByPlaceholderText(/ABCDE1234F/i);
    const submitBtn = screen.getByRole("button", { name: /Register Customer Profile/i });

    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });
    fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "9876543210" } });
    fireEvent.change(aadhaarInput, { target: { value: "123456789012" } });
    fireEvent.change(panInput, { target: { value: "ABCDE1234F" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createCustomerSpy).toHaveBeenCalledWith(
        {
          name: "Alice Smith",
          email: "alice@example.com",
          phoneNumber: "9876543210",
          aadhaarNumber: "123456789012",
          panNumber: "ABCDE1234F",
          password: "Customer@123",
        },
        { username: "teller", password: "123" }
      );
      expect(setSuccess).toHaveBeenCalledWith(
        "Customer profile created successfully with PENDING KYC. You can now confirm their KYC below."
      );
      expect(onCustomerCreated).toHaveBeenCalled();
    });
  });
});
