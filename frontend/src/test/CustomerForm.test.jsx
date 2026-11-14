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

    const nameInput = screen.getByPlaceholderText("Enter customer's full name");
    const emailInput = screen.getByPlaceholderText("customer@example.com");
    const submitBtn = screen.getByRole("button", { name: /Register Customer/i });

    fireEvent.change(nameInput, { target: { value: "Alice Smith" } });
    fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createCustomerSpy).toHaveBeenCalledWith(
        "Alice Smith",
        "alice@example.com",
        { username: "teller", password: "123" }
      );
      expect(setSuccess).toHaveBeenCalledWith("Customer profile created successfully.");
      expect(onCustomerCreated).toHaveBeenCalled();
    });
  });
});
