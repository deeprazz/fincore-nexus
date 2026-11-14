package com.fincore.payment_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${fincore.security.teller-password:Teller@123}")
    private String tellerPassword;

    @Value("${fincore.security.manager-password:Manager@123}")
    private String managerPassword;

    @Value("${fincore.security.admin-password:Admin@123}")
    private String adminPassword;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        var manager = new InMemoryUserDetailsManager();
        manager.createUser(User.withUsername("teller").password(encoder.encode(tellerPassword)).roles("TELLER").build());
        manager.createUser(User.withUsername("manager").password(encoder.encode(managerPassword)).roles("MANAGER").build());
        manager.createUser(User.withUsername("admin").password(encoder.encode(adminPassword)).roles("ADMIN").build());
        return manager;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/beneficiaries/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/beneficiaries/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/beneficiaries/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/payments/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/payments/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/settlement/**").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/settlement/**").hasAnyRole("MANAGER", "ADMIN")
                .anyRequest().authenticated()
            )
            .httpBasic(basic -> {});
        return http.build();
    }
}
