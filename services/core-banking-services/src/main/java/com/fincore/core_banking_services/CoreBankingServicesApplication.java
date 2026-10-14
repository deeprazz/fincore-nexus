package com.fincore.core_banking_services;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class CoreBankingServicesApplication {

	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));   // must run before Spring starts
		SpringApplication.run(CoreBankingServicesApplication.class, args);
	}
}