import { ApiError, ScannedBarcodeResponse } from "@/types";
import { apiClient } from "@/utils/apiClient";
import { AxiosError } from "axios";

export class BarcodeError extends Error {
  constructor(
    public message: string,
    public errorCode?: string
  ) {
    super(message);
    this.name = "BarcodeError";
  }
}

export const barcodeService = {
  /**
   * Scan a barcode to get patient information and active medication orders
   * Throws BarcodeError with errorCode for special handling
   */
  scanBarcode: async (
    barcodeString: string
  ): Promise<ScannedBarcodeResponse> => {
    try {
      const response = await apiClient.get<ScannedBarcodeResponse>(
        `/barcodes/scan/${barcodeString}`
      );
      return response.data;
    } catch (error) {
      console.log("Error in scanBarcode:", error);

      // Check if it's an Axios error with a response
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        console.log("Error response data:", errorData);
        console.log("Error status:", axiosError.response.status);

        // Extract message and errorCode from response
        const message =
          typeof errorData === "string" ? errorData : errorData.message;
        const errorCode =
          typeof errorData === "object" && errorData.errorCode
            ? errorData.errorCode
            : "BARCODE_NOT_FOUND"; // Default error code for 404 responses

        console.log("Throwing BarcodeError with:", { message, errorCode });
        throw new BarcodeError(message, errorCode);
      }

      // Fallback: rethrow original error
      throw error;
    }
  },

  /**
   * Link a barcode to a patient
   */
  linkBarcode: async (
    barcodeString: string,
    patientId: string
  ): Promise<void> => {
    // the backend accepts: patientId, and barcodeIdString
    const barcodeIdString = barcodeString;

    await apiClient.post("/barcodes/link", {
      patientId,
      barcodeIdString,
    });
  },
};
